"use client";

import PostList from '../components/PostList';
import { useApp } from '../hooks/useApp';
import { AuthError } from '../lib/error';

export default function Home() {
  const { user, isLoggedIn, error: authError, login, logout } = useApp();
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
      </div>
    );
  }

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
      <PostList />
    </main>
  );
}
