// Supabase 認証サービス
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
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      // セッションが存在しない場合は正常な状態として扱う
      if (error.message.includes('Auth session missing')) {
        return null;
      }
      return null;
    }

    return user;
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

  // LINE ID トークンでのログイン
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

      // セッション情報を使ってSupabaseセッションを確立
      if (data?.session && data?.user) {
        const sessionData = data.session;
        const userData = data.user as User;


        // 正式なセッションを設定
        const { error: sessionError } = await supabase.auth.setSession(sessionData);

        if (sessionError && sessionError.message.includes('Invalid JWT')) {
          await this.setAuthUser(userData);
        }

        return { data: { user: userData }, error: null };
      }

      // フォールバック: ユーザー情報のみの場合
      if (data?.user) {
        const userData = data.user as User;
        await this.setAuthUser(userData);
        return { data: { user: userData }, error: null };
      }

      return { data: { user: null }, error: new Error('User data not found in response') as SupabaseAuthError };
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

      // ログアウト後にグローバル変数をクリア
      this.clearAuthCache();
    } catch (err) {
      throw new AuthError(
        err instanceof Error ? err.message : 'ログアウトに失敗しました'
      );
    }
  }

  // Set系メソッド
  private async setAuthUser(userData: User): Promise<void> {
    // ユーザー情報はAuthContextで管理されるため、ここでは設定しない


    // LINEユーザー情報を取得
    const liff = await import('@line/liff');
    const profile = await liff.default.getProfile();

    // public.usersテーブルにユーザー情報を挿入/更新
    const { error: upsertError } = await supabase
      .from('users')
      .upsert({
        id: userData.id,
        line_user_id: profile.userId,
        display_name: profile.displayName,
        avatar_url: profile.pictureUrl
      }, {
        onConflict: 'id'
      });
  }

  // ログアウト時のクリア処理
  private clearAuthCache(): void {
    // AuthContextで管理されるため、ここでは何もしない
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
