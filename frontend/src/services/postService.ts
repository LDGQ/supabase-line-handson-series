// ハンズオン3-4: 投稿データサービス
// Supabase からの投稿データ取得・更新・削除機能
import { supabase } from './supabaseClient';
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

  // 定数
  private static readonly SIGNED_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 30; // 30日間
  private static readonly POST_IMAGES_BUCKET = 'post-images';

  private constructor() {}

  static getInstance(): PostService {
    if (!PostService.instance) {
      PostService.instance = new PostService();
    }
    return PostService.instance;
  }

  // ハンズオン3-4: 投稿データ取得
  // データベースから現在のユーザーの投稿一覧を取得
  async getPosts(): Promise<Post[]> {
    return this.executeWithAuth(async (user) => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new AuthError(`投稿の取得に失敗しました: ${error.message}`, error.code);
      }

      return data || [];
    }, '投稿の取得に失敗しました');
  }

  async updatePost(id: string, updates: PostUpdateData): Promise<Post> {
    return this.executeWithAuth(async (user) => {
      const { data, error } = await supabase
        .from('posts')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id) // 自分の投稿のみ更新可能
        .select();

      if (error) {
        throw new AuthError(`投稿の更新に失敗しました: ${error.message}`, error.code);
      }

      if (!data || data.length === 0) {
        throw new AuthError('投稿が見つからないか、更新権限がありません', 'NOT_FOUND');
      }

      return data[0];
    }, '投稿の更新に失敗しました');
  }

  async deletePost(id: string): Promise<void> {
    return this.executeWithAuth(async (user) => {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // 自分の投稿のみ削除可能

      if (error) {
        throw new AuthError(`投稿の削除に失敗しました: ${error.message}`, error.code);
      }
    }, '投稿の削除に失敗しました');
  }

  // ハンズオン3-5: Storage 画像URL処理
  // ストレージパスから署名付きURLを生成して画像を表示
  async getImageUrl(imageUrl: string): Promise<string | null> {
    try {
      // null または空文字の場合はnullを返す
      if (!imageUrl || imageUrl.trim() === '') {
        return null;
      }

      // 既に完全なURLの場合はそのまま返す
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        // 署名付きURLの場合は期限切れの可能性があるので再生成を試行
        if (imageUrl.includes('token=')) {
          const refreshed = await this.refreshSignedUrl(imageUrl);
          if (refreshed) {
            return refreshed;
          } else {
            return imageUrl;
          }
        }

        // 通常のURLの場合はそのまま返す
        return imageUrl;
      }

      // ストレージパスの場合は署名付きURLを生成
      return await this.createSignedUrl(imageUrl);
    } catch (error) {
      console.error('画像URLの取得に失敗しました:', error);
      // エラーが発生した場合はnullを返す（エラーを投げない）
      return null;
    }
  }

  /**
   * パブリックURLが利用可能かチェックし、利用可能な場合は返す
   */
  private async tryPublicUrl(bucketName: string, objectPath: string): Promise<string | null> {
    const { data: pub } = supabase.storage.from(bucketName).getPublicUrl(objectPath);
    if (pub?.publicUrl) {
      try {
        const headResponse = await fetch(pub.publicUrl, { method: 'HEAD' });
        if (headResponse.ok) {
          return pub.publicUrl;
        }
      } catch (error) {
        // パブリックURLチェックに失敗した場合は署名付きURLを試行
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
      console.error('署名付きURLの生成に失敗:', error.message);

      // ファイルが存在しない場合や権限エラーの場合はnullを返す
      if (this.isStorageErrorRecoverable(error.message)) {
        console.warn('画像ファイルが見つからないか、アクセス権限がありません:', objectPath);
        return null;
      }
      return null;
    }

    if (!signed?.signedUrl) {
      console.warn('署名付きURLの生成に失敗: signedUrlがnull');
      return null;
    }

    return signed.signedUrl;
  }

  /**
   * ストレージパスから署名付きURLを生成
   */
  private async createSignedUrl(storagePath: string): Promise<string | null> {
    try {
      const pathParts = storagePath.split('/');
      if (pathParts.length < 2) {
        console.warn('無効なストレージパス:', storagePath);
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
    } catch (error) {
      console.error('createSignedUrlでエラーが発生:', error);
      return null;
    }
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
      console.error('署名付きURLの更新に失敗しました:', error);
      return null;
    }
  }

  // ユーティリティメソッド
  /**
   * ユーザー認証とエラーハンドリングを共通化したプライベートメソッド
   */
  private async executeWithAuth<T>(
    operation: (user: any) => Promise<T>,
    errorMessage: string
  ): Promise<T> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new AuthError('ユーザー認証に失敗しました', 'AUTH_ERROR');
      }

      return await operation(user);
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
