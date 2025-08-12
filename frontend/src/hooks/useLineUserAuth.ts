// ハンズオン2-4: LIFF 認証カスタムフック
// LINE ログイン状態の管理とSupabase認証の連携
import { useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { LineAuthProvider } from '../services/providers/LineAuthProvider';
import { LiffService, LiffConfig } from '../services/liffService';
import { AuthError } from '../lib/error';

export type UseUserAuthReturn = {
  user: User | null;
  isLoggedIn: boolean;
  loading: boolean;
  error: Error | null;
  login: () => void;
  logout: () => Promise<void>;
};

export function useLineUserAuth(): UseUserAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const authProvider = LineAuthProvider.getInstance();
  const liffService = LiffService.getInstance();

  // Handle系メソッド
  const handleTokenExpired = useCallback(() => {
    setError(new AuthError('IDトークンが期限切れです。再ログインしてください。', 'TOKEN_EXPIRED'));
    setTimeout(() => {
      liffService.login();
    }, 1000);
  }, [liffService]);

  const handleAuthError = useCallback((err: unknown) => {
    if (err instanceof Error && (
      err.message.includes('IDトークンが期限切れ') ||
      err.message.includes('TOKEN_EXPIRED') ||
      err.message.includes('IdToken expired')
    )) {
      handleTokenExpired();
    } else {
      setIsLoggedIn(false);
      setUser(null);
    }
  }, [handleTokenExpired]);

  // ハンズオン2-4: LIFF 初期化処理
  // 環境変数の LIFF ID を使用してLIFFサービスを初期化
  const initializeLiff = useCallback(async (): Promise<void> => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!liffId) {
      throw new AuthError('LIFF IDが設定されていません', 'CONFIG_ERROR');
    }

    if (liffService.isInitialized()) {
      return;
    }

    const config: LiffConfig = {
      liffId,
      withLoginOnExternalBrowser: true
    };

    try {
      await liffService.initialize(config);
      authProvider.setConfig(config);
    } catch (error) {
      throw error;
    }
  }, [liffService, authProvider]);

  // Login/Logout系メソッド
  const login = useCallback(() => {
    try {
      setError(null);
      liffService.login();
    } catch (err) {
      setError(new AuthError(
        err instanceof Error ? err.message : 'ログインに失敗しました',
        'LOGIN_ERROR'
      ));
    }
  }, [liffService]);

  const logout = useCallback(async () => {
    try {
      await authProvider.logout();
      setUser(null);
      setIsLoggedIn(false);
      setError(null);
    } catch (err) {
      setError(new AuthError(
        err instanceof Error ? err.message : 'ログアウトに失敗しました',
        'LOGOUT_ERROR'
      ));
    }
  }, [authProvider]);

  // ハンズオン2-4: ログイン状態チェック
  // LIFF認証状態を確認し、Supabaseセッションを確立
  const checkLoginStatus = useCallback(async (): Promise<void> => {
    const isLoggedIn = await authProvider.isLoggedIn();
    setIsLoggedIn(isLoggedIn);

    if (isLoggedIn) {
      try {
        const user = await authProvider.ensureSession();
        setUser(user);
      } catch (err) {
        if (err instanceof AuthError && err.code === 'LOGIN_REQUIRED') {
          login();
          return;
        }
        handleAuthError(err);
      }
    } else {
      setUser(null);
    }
  }, [authProvider, handleAuthError, login]);

  const initialize = useCallback(async (): Promise<void> => {
    try {
      await initializeLiff();
      await checkLoginStatus();
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err);
      } else {
        setError(new AuthError(
          err instanceof Error ? err.message : '認証エラーが発生しました',
          'INIT_ERROR'
        ));
      }
    } finally {
      setLoading(false);
    }
  }, [initializeLiff, checkLoginStatus]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return { user, isLoggedIn, loading, error, login, logout };
} 