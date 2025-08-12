// ハンズオン2-4: Supabase 認証サービス
// LIFF ID トークンを使用したSupabase認証の管理
import { AuthError as SupabaseAuthError, User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { AuthError } from '../lib/error';

export interface SignInResult {
  data: { user: User | null };
  error: SupabaseAuthError | null;
}

export interface SessionResult {
  session: unknown | null;
  error: AuthError | null;
}

export class SupabaseAuthService {
  private static instance: SupabaseAuthService;

  private constructor() {}

  static getInstance(): SupabaseAuthService {
    if (!SupabaseAuthService.instance) {
      SupabaseAuthService.instance = new SupabaseAuthService();
    }
    return SupabaseAuthService.instance;
  }

  // Get系メソッド
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        // セッションが存在しない場合は正常な状態として扱う
        if (error.message.includes('Auth session missing')) {
          return null;
        }
        return null;
      }
      
      return user;
    } catch {
      return null;
    }
  }

  async getSession(): Promise<SessionResult> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        throw new AuthError(`セッション取得に失敗しました: ${error.message}`, error.status?.toString());
      }
      return { session, error: null };
    } catch (err) {
      return { session: null, error: err as AuthError };
    }
  }

  // ハンズオン2-4: LINE ID トークンでのログイン
  // Edge Function (line-liff-auth) を呼び出してSupabaseセッションを作成
  async signInWithIdToken(idToken: string): Promise<SignInResult> {
    try {
      const requestBody = { id_token: idToken };
      
      const { data, error } = await supabase.functions.invoke('line-liff-auth', {
        body: requestBody
      });

      if (error) {
        const enhancedError = this.handleAuthError(error);
        return { data: { user: null }, error: enhancedError };
      }

      if (data?.session) {
        const sessionResult = await this.setSession(data.session);
        if (sessionResult.error) {
          return { data: { user: null }, error: sessionResult.error };
        }
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        return { data: { user: null }, error: userError };
      }

      return { data: { user }, error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('LINE認証に失敗しました');
      return {
        data: { user: null },
        error: new SupabaseAuthError(error.message)
      };
    }
  }

  // Logout系メソッド
  async logout(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new AuthError(`ログアウトに失敗しました: ${error.message}`, error.status?.toString());
      }
      
      // ログアウト後にキャッシュをクリア
      this.clearAuthCache();
    } catch (err) {
      throw new AuthError(
        err instanceof Error ? err.message : 'ログアウトに失敗しました'
      );
    }
  }

  // Set系メソッド
  private async setSession(session: { access_token: string; refresh_token: string }): Promise<{ error: SupabaseAuthError | null }> {
    try {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      });

      if (sessionError) {
        return { error: sessionError };
      }

      return { error: null };
    } catch (error) {
      return { 
        error: new SupabaseAuthError(
          error instanceof Error ? error.message : 'セッション設定に失敗しました'
        ) 
      };
    }
  }

  // キャッシュクリアメソッド
  private clearAuthCache(): void {
    console.log('Supabase認証キャッシュクリア開始');
    
    try {
      // Supabase関連のlocalStorageをクリア
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('supabase') ||
          key.includes('sb-') ||
          key.startsWith('supabase.')
        )) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        console.log('Supabase localStorage削除:', key);
        localStorage.removeItem(key);
      });
      
      console.log('Supabase認証キャッシュクリア完了');
    } catch (error) {
      console.error('Supabaseキャッシュクリアエラー:', error);
    }
  }

  // ユーティリティメソッド
  private handleAuthError(error: unknown): SupabaseAuthError {
    // 型ガードでエラーオブジェクトをチェック
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = error.message;
      
      // 新しいエラーレスポンス形式（code: 'TOKEN_EXPIRED'）
      if (typeof errorMessage === 'object' && errorMessage && 'code' in errorMessage && errorMessage.code === 'TOKEN_EXPIRED') {
        return new SupabaseAuthError('IDトークンが期限切れです');
      }
      
      // 従来のエラーメッセージ形式
      if (typeof errorMessage === 'string' && errorMessage.includes('IdToken expired')) {
        return new SupabaseAuthError('IDトークンが期限切れです');
      }
      
      // Edge Functionから返されるエラーレスポンス形式
      if (typeof errorMessage === 'object' && errorMessage && 'error' in errorMessage && errorMessage.error === 'ID_TOKEN_EXPIRED') {
        return new SupabaseAuthError('IDトークンが期限切れです');
      }
    }
    
    return new SupabaseAuthError('認証エラーが発生しました');
  }
}

// デフォルトエクスポートも追加
export default SupabaseAuthService;
