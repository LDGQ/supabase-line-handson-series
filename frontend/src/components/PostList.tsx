"use client";

// ハンズオン3-4: 投稿一覧コンポーネント
// ユーザーの投稿データを一覧表示し、カード形式で表示
import { useLineUserAuth } from '../hooks/useLineUserAuth';
import { usePost } from '../hooks/usePost';
import PostCard from './PostCard';
import { AuthError } from '../lib/error';

export default function PostList() {
  const { user, loading: isAuthLoading } = useLineUserAuth();
  const { posts, loading: isPostLoading, error, updatePost, deletePost, refreshPosts } = usePost();

  if (isAuthLoading || isPostLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600 text-sm">
            {isAuthLoading ? '認証情報を確認中...' : '投稿を読み込み中...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    const isAuthError = error instanceof AuthError;
    const errorCode = isAuthError ? error.code : undefined;
    
    return (
      <div className="text-center p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md mx-auto mb-4">
          <strong className="font-bold">エラーが発生しました</strong>
          <p className="block sm:inline">{error.message}</p>
          {errorCode && (
            <p className="text-xs mt-1">エラーコード: {errorCode}</p>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center p-8">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative max-w-md mx-auto">
          <strong className="font-bold">ログインが必要です</strong>
          <p className="block sm:inline">投稿を表示するにはログインしてください。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー部分 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">マイ投稿</h2>
        </div>
        <button
          onClick={refreshPosts}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors text-sm"
        >
          更新
        </button>
      </div>

      {/* 投稿一覧 */}
      {posts.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-100 rounded-lg p-8 max-w-md mx-auto">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">まだ投稿がありません</h3>
            <p className="text-gray-500 text-sm">
              LINE Botを使って写真を投稿してみましょう！
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* ハンズオン3-4: PostCard コンポーネントの使用 */}
          {posts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              onUpdate={updatePost}
              onDelete={deletePost}
            />
          ))}
        </div>
      )}

      {/* 投稿数表示 */}
      {/* {posts.length > 0 && (
        <div className="text-center text-gray-500 text-sm">
          合計 {posts.length} 件の投稿
        </div>
      )} */}
    </div>
  );
} 