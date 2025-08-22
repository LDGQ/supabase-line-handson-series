// 統合されたアプリケーションフック
// LINE認証と投稿管理を統合したシンプルなAPI
import { useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { Post } from '../types/database';
import { LineAuthProvider } from '../services/providers/LineAuthProvider';
import { LiffService, LiffConfig } from '../services/liffService';
import { PostService, PostUpdateData } from '../services/postService';
import { AuthError } from '../lib/error';
import { useAuth } from '../contexts/AuthContext';

export type UseAppReturn = {
  // 認証関連
  user: User | null;
  isLoggedIn: boolean;
  error: Error | null;
  login: () => void;
  logout: () => Promise<void>;
  
  // 投稿関連
  posts: Post[];
  updatePost: (postId: string, updates: PostUpdateData) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  refreshPosts: () => Promise<void>;
};

export function useApp(): UseAppReturn {
  const { user, setUser } = useAuth();
  
  // 認証状態
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // 投稿状態
  const [posts, setPosts] = useState<Post[]>([]);

  // サービスインスタンス
  const authProvider = LineAuthProvider.getInstance();
  const liffService = LiffService.getInstance();
  const postService = PostService.getInstance();

  // エラーハンドリング
  const handleTokenExpired = useCallback(() => {
    setError(new AuthError('IDトークンが期限切れです。再ログインしてください。', 'TOKEN_EXPIRED'));
    setTimeout(() => {
      liffService.login();
    }, 1000);
  }, []);

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
  }, [handleTokenExpired, setUser]);

  // LIFF初期化
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
  }, []);

  // ログイン/ログアウト
  const login = useCallback(() => {
    setError(null);
    liffService.login();
  }, []);

  const logout = useCallback(async () => {
    try {
      await authProvider.logout();
      setUser(null);
      setIsLoggedIn(false);
      setError(null);
      setPosts([]);
    } catch (err) {
      setError(new AuthError(
        err instanceof Error ? err.message : 'ログアウトに失敗しました',
        'LOGOUT_ERROR'
      ));
    }
  }, [setUser]);

  // ログイン状態チェック
  const checkLoginStatus = useCallback(async (): Promise<void> => {
    try {
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
    } catch (error) {
      setError(new AuthError('ログイン状態の確認に失敗しました', 'CHECK_STATUS_ERROR'));
    }
  }, [handleAuthError, login, setUser]);

  // 投稿データ取得
  const fetchPosts = useCallback(async () => {
    if (!user) {
      setPosts([]);
      return;
    }

    try {
      setError(null);
      const posts = await postService.getPosts(user);
      setPosts(posts);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('投稿の取得に失敗しました'));
    }
  }, [user]);

  const refreshPosts = useCallback(async () => {
    await fetchPosts();
  }, [fetchPosts]);

  // 投稿更新
  const updatePost = useCallback(async (postId: string, updates: PostUpdateData) => {
    if (!user) return;

    try {
      setError(null);
      const updatedPost = await postService.updatePost(postId, updates, user);
      
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId ? updatedPost : post
        )
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error('投稿の更新に失敗しました');
      setError(error);
      throw error;
    }
  }, [user]);

  // 投稿削除
  const deletePost = useCallback(async (postId: string) => {
    if (!user) return;

    try {
      setError(null);
      await postService.deletePost(postId, user);
      
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('投稿の削除に失敗しました');
      setError(error);
      throw error;
    }
  }, [user]);

  // 初期化処理
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
    }
  }, [initializeLiff, checkLoginStatus]);

  // 初期化エフェクト
  useEffect(() => {
    initialize();
  }, []);

  // 投稿取得エフェクト
  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user, fetchPosts]);

  return {
    // 認証関連
    user,
    isLoggedIn,
    error,
    login,
    logout,
    
    // 投稿関連
    posts,
    updatePost,
    deletePost,
    refreshPosts
  };
}