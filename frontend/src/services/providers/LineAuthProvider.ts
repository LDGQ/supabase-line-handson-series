import { User } from '@supabase/supabase-js';
import { AuthProvider } from './IAuthProvider';
import { LiffService, LiffConfig } from '../liffService';
import { SupabaseAuthService } from '../supabaseAuthService';
import { AppError, AuthError } from '../../lib/error';

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: AuthError;
}

export class LineAuthProvider implements AuthProvider {
  private static instance: LineAuthProvider;
  private liffService: LiffService;
  private supabaseService: SupabaseAuthService;
  private config: LiffConfig | null = null;

  public readonly name = 'LINE';

  private constructor() {
    this.liffService = LiffService.getInstance();
    this.supabaseService = SupabaseAuthService.getInstance();
  }

  static getInstance(): LineAuthProvider {
    if (!LineAuthProvider.instance) {
      LineAuthProvider.instance = new LineAuthProvider();
    }
    return LineAuthProvider.instance;
  }

  // Set系メソッド
  setConfig(config: LiffConfig): void {
    this.config = config;
  }

  // Get系メソッド
  async isLoggedIn(): Promise<boolean> {
    try {
      const liffLoggedIn = await this.liffService.isLoggedIn();

      if (!liffLoggedIn) {
        return false;
      }

      // LIFFがログイン状態の場合は、セッション確立を1回のみ試行
      const result = await this.attemptSessionEstablishment();
      return result.success;
    } catch (error) {
      console.error('isLoggedIn エラー:', error);
      return false;
    }
  }

  // Login/Logout系メソッド
  login(): void {
    this.liffService.login();
  }

  async logout(): Promise<void> {
    try {
      await Promise.all([
        this.supabaseService.logout(),
        Promise.resolve(this.liffService.logout())
      ]);
    } catch (err) {
      throw new AuthError(
        err instanceof Error ? err.message : 'ログアウトに失敗しました',
        'LOGOUT_FAILED'
      );
    }
  }

  // Ensure系メソッド
  async ensureSession(): Promise<User> {
    try {
      const isLiffLoggedIn = await this.liffService.isLoggedIn();

      if (!isLiffLoggedIn) {
        this.liffService.login();
        throw new AuthError('ログインページにリダイレクトします', 'LOGIN_REQUIRED');
      }

      // IDトークンの取得と検証
      const result = await this.authenticateWithIdToken();
      
      if (result.success && result.user) {
        return result.user;
      }
      
      if (result.error) {
        throw result.error;
      }

      throw new AuthError('認証に失敗しました', 'AUTH_FAILED');
    } catch (err) {
      if (err instanceof AuthError) {
        throw err;
      }
      throw new AuthError(
        err instanceof Error ? err.message : '認証エラーが発生しました',
        'UNKNOWN_ERROR'
      );
    }
  }

  // Attempt系メソッド
  private async attemptSessionEstablishment(): Promise<AuthResult> {
    try {
      const liffStatus = this.liffService.getInitializationStatus();
      
      if (!liffStatus.isInitialized) {
        return { 
          success: false, 
          error: new AuthError('LIFFが初期化されていません', 'LIFF_NOT_INITIALIZED') 
        };
      }

      let idToken = await this.liffService.getIdToken();
      
      if (!idToken) {
        const refreshSuccess = await this.liffService.forceRefreshLogin();
        if (refreshSuccess) {
          idToken = await this.liffService.getIdToken();
        }
      }
      
      if (!idToken) {
        return { 
          success: false, 
          error: new AuthError('ログインが必要です', 'LOGIN_REQUIRED') 
        };
      }

      const { data: { user }, error } = await this.supabaseService.signInWithIdToken(idToken);
      if (error) {
        return { 
          success: false, 
          error: AppError.isIdTokenExpired(error) 
            ? new AuthError('IDトークンが期限切れです', 'TOKEN_EXPIRED')
            : new AuthError(error.message, error.status?.toString())
        };
      }

      if (user) {
        return { success: true, user };
      } else {
        return { success: false, error: new AuthError('ユーザー情報が取得できません', 'USER_NOT_FOUND') };
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof AuthError ? err : new AuthError('セッション確立に失敗しました', 'SESSION_FAILED')
      };
    }
  }

  // Authenticate系メソッド
  private async authenticateWithIdToken(): Promise<AuthResult> {
    try {
      const idToken = await this.liffService.getIdToken();

      if (!idToken) {
        throw new AuthError('IDトークンが取得できません', 'TOKEN_MISSING');
      }

      const { data: { user }, error } = await this.supabaseService.signInWithIdToken(idToken);
      
      if (error) {
        throw new AuthError(error.message, error.status?.toString());
      }

      if (!user) {
        throw new AuthError('ユーザー情報の取得に失敗しました', 'USER_NOT_FOUND');
      }

      return { success: true, user };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof AuthError ? err : new AuthError('認証に失敗しました', 'AUTH_FAILED')
      };
    }
  }
}
