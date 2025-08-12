"use client";

// ハンズオン2-4: LIFF アプリのメインページ
// LINE ログイン認証と投稿一覧表示
import Image from 'next/image';
import PostList from '../components/PostList';
import { useLineUserAuth } from '../hooks/useLineUserAuth';
import { AuthError } from '../lib/error';

// デバッグ情報表示コンポーネント
function DebugInfo({ user, isLoggedIn, loading, error }: any) {
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-xs max-w-sm">
      <h3 className="font-bold mb-2">デバッグ情報</h3>
      <div>Loading: {loading ? 'true' : 'false'}</div>
      <div>LoggedIn: {isLoggedIn ? 'true' : 'false'}</div>
      <div>User: {user ? 'exists' : 'null'}</div>
      <div>Error: {error ? error.message : 'none'}</div>
      <div>LIFF ID: {process.env.NEXT_PUBLIC_LIFF_ID ? 'set' : 'not set'}</div>
      <div>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'not set'}</div>
    </div>
  );
}

export default function Home() {
  // ハンズオン2-4: LIFF 認証フックの使用
  // LINE ユーザー認証状態の管理
  const { user, isLoggedIn, loading: authLoading, error: authError, login, logout } = useLineUserAuth();

  // ハンズオン2-4: 認証処理中の表示
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">認証情報を確認中...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    const isAuthError = authError instanceof AuthError;
    const errorCode = isAuthError ? authError.code : undefined;
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md w-full mb-4">
          <strong className="font-bold">エラーが発生しました</strong>
          <p className="block sm:inline">{authError.message}</p>
          {errorCode && (
            <p className="text-xs mt-1">エラーコード: {errorCode}</p>
          )}
        </div>
        
        {/* エラーの種類に応じたボタンを表示 */}
        {errorCode === 'TOKEN_EXPIRED' || errorCode === 'LOGIN_REQUIRED' ? (
          <button
            onClick={login}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            再度ログインする
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              ページを再読み込み
            </button>
            <button
              onClick={login}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              ログイン
            </button>
          </div>
        )}
        
        <DebugInfo user={user} isLoggedIn={isLoggedIn} loading={authLoading} error={authError} />
      </div>
    );
  }

  // ハンズオン2-4: 未ログイン時のログイン画面
  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">LINE Photo Post</h1>
          <p className="text-gray-600 mb-8">LINEでログインして写真を投稿・共有しよう！</p>
          <button
            onClick={login}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            LINEでログイン
          </button>
        </div>
        <DebugInfo user={user} isLoggedIn={isLoggedIn} loading={authLoading} error={authError} />
      </div>
    );
  }

  // ハンズオン3-3: ログイン後のメイン画面
  // ハンズオン3-4: 投稿一覧表示
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">LINE Photo Post</h1>
        <div className="flex items-center gap-4">
          <p className="text-gray-600">
            {user?.email}
          </p>
          <button
            onClick={logout}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            ログアウト
          </button>
        </div>
      </div>
      {/* ハンズオン3-4: 投稿リストコンポーネント */}
      <PostList />
      <DebugInfo user={user} isLoggedIn={isLoggedIn} loading={authLoading} error={authError} />
    </main>
  );
}
