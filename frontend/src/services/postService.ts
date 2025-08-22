import { supabase } from './supabaseClient';
import { User } from '@supabase/supabase-js';
import { Post } from '../types/database';
import { AuthError } from '../lib/error';

export interface PostUpdateData {
  comment?: string | null;
  image_url?: string | null;
  address?: string | null;
  latitude?: number;
  longitude?: number;
}

export class PostService {
  private static instance: PostService;
  private static readonly SIGNED_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 30;
  private static readonly POST_IMAGES_BUCKET = 'post-images';

  private constructor() {}

  static getInstance(): PostService {
    if (!PostService.instance) {
      PostService.instance = new PostService();
    }
    return PostService.instance;
  }

  async getPosts(user?: User): Promise<Post[]> {
    return this.executeWithAuth(async (user: User) => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });


      if (error) {
        throw new AuthError(`投稿の取得に失敗しました: ${error?.message || 'Unknown error'}`, error?.code);
      }

      // 自分の投稿のみフィルタリング
      const myPosts = data?.filter(post => post.user_id === user.id) || [];
      const postsWithUserInfo = await Promise.all(
        myPosts.map(async (post) => {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('display_name, avatar_url')
            .eq('id', post.user_id)
            .single();

          if (!userError && userData) {
            return {
              ...post,
              user: userData
            };
          }

          return {
            ...post,
            user: null
          };
        })
      );

      return postsWithUserInfo;
    }, '投稿の取得に失敗しました', user);
  }

  async updatePost(id: string, updates: PostUpdateData, user?: User): Promise<Post> {
    return this.executeWithAuth(async (user: User) => {
      const { data, error } = await supabase
        .from('posts')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select();

      if (error) {
        throw new AuthError(`投稿の更新に失敗しました: ${error.message}`, error.code);
      }

      if (!data || data.length === 0) {
        throw new AuthError('投稿が見つからないか、更新権限がありません', 'NOT_FOUND');
      }

      return data[0];
    }, '投稿の更新に失敗しました', user);
  }

  async deletePost(id: string, user?: User): Promise<void> {
    return this.executeWithAuth(async (user: User) => {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw new AuthError(`投稿の削除に失敗しました: ${error.message}`, error.code);
      }
    }, '投稿の削除に失敗しました', user);
  }

  async getImageUrl(imageUrl: string): Promise<string | null> {
    if (!imageUrl || imageUrl.trim() === '') {
      return null;
    }

    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      if (imageUrl.includes('token=')) {
        const refreshed = await this.refreshSignedUrl(imageUrl);
        if (refreshed) {
          return refreshed;
        } else {
          return imageUrl;
        }
      }

      return imageUrl;
    }

    return await this.createSignedUrl(imageUrl);
  }

  private async tryPublicUrl(bucketName: string, objectPath: string): Promise<string | null> {
    const { data: pub } = supabase.storage.from(bucketName).getPublicUrl(objectPath);
    if (pub?.publicUrl) {
      const headResponse = await fetch(pub.publicUrl, { method: 'HEAD' });
      if (headResponse.ok) {
        return pub.publicUrl;
      }
    }
    return null;
  }

  /**
   * エラーメッセージからエラータイプを判定する
   */
  private isStorageErrorRecoverable(errorMessage: string): boolean {
    return errorMessage.includes('Object not found') ||
           errorMessage.includes('not found') ||
           errorMessage.includes('Bad Request') ||
           errorMessage.includes('Forbidden');
  }

  /**
   * 署名付きURLを生成する（内部実装）
   */
  private async generateSignedUrl(bucketName: string, objectPath: string): Promise<string | null> {
    const { data: signed, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(objectPath, PostService.SIGNED_URL_EXPIRY_SECONDS);

    if (error) {

      // ファイルが存在しない場合や権限エラーの場合はnullを返す
      if (this.isStorageErrorRecoverable(error.message)) {
        return null;
      }
      return null;
    }

    if (!signed?.signedUrl) {
      return null;
    }

    return signed.signedUrl;
  }

  /**
   * ストレージパスから署名付きURLを生成
   */
  private async createSignedUrl(storagePath: string): Promise<string | null> {
    const pathParts = storagePath.split('/');
    if (pathParts.length < 2) {
      return null;
    }

    const bucketName = pathParts[0];
    const objectPath = pathParts.slice(1).join('/');

    // まずパブリックURLを試行
    const publicUrl = await this.tryPublicUrl(bucketName, objectPath);
    if (publicUrl) {
      return publicUrl;
    }

    // パブリックURLが利用できない場合は署名付きURLを生成
    return await this.generateSignedUrl(bucketName, objectPath);
  }

  /**
   * 既存のURLが有効かどうかをチェックし、必要に応じて更新する
   */
  private async refreshSignedUrl(url: string): Promise<string | null> {
    try {
      // バケット内パスを抽出
      const match = url.match(/post-images\/([^?]+)/);
      if (!match) return null;
      const objectPath = match[1];

      // パブリック URL チェック
      const publicUrl = await this.tryPublicUrl(PostService.POST_IMAGES_BUCKET, objectPath);
      if (publicUrl) {
        return publicUrl;
      }

      // 新しい署名付き URL
      return await this.generateSignedUrl(PostService.POST_IMAGES_BUCKET, objectPath);
    } catch (error) {
      return null;
    }
  }

  // ユーティリティメソッド
  /**
   * ユーザー認証とエラーハンドリングを共通化したメソッド
   * Note: AuthContextのuseAuth hookを使用するには、このサービスをコンポーネント内で呼び出す必要がある
   */
  async executeWithAuth<T>(
    operation: (user: User) => Promise<T>,
    errorMessage: string,
    user?: User
  ): Promise<T> {
    try {
      // ユーザー情報が渡された場合はそれを使用
      if (user) {
        return await operation(user);
      }

      // フォールバック: Supabaseの標準認証を試行
      const { data: { user: supabaseUser }, error: userError } = await supabase.auth.getUser();

      if (supabaseUser && !userError) {
        return await operation(supabaseUser);
      }

      throw new AuthError('ユーザー認証に失敗しました', 'AUTH_ERROR');
    } catch (err) {
      if (err instanceof AuthError) {
        throw err;
      }
      throw new AuthError(
        err instanceof Error ? err.message : errorMessage,
        'UNKNOWN_ERROR'
      );
    }
  }
}
