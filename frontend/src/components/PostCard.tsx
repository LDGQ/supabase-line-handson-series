"use client";

// ハンズオン3-4: 投稿カードコンポーネント
// データベースから取得した投稿データの表示・編集・削除機能
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Post } from '../types/database';
import { PostService, PostUpdateData } from '../services/postService';
import debounce from 'lodash/debounce';

interface PostCardProps {
  post: Post;
  onUpdate: (id: string, updates: PostUpdateData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function PostCard({ post, onUpdate, onDelete }: PostCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editComment, setEditComment] = useState(post.comment || '');
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const postService = PostService.getInstance();

  // ハンズオン3-5: Storage 画像URL取得
  // Supabase Storage から署名付きURLを取得して画像を表示
  useEffect(() => {
    const getImageUrl = async () => {
      if (!post.image_url) {
        setImageUrl(null);
        setImageLoading(false);
        return;
      }

      try {
        const url = await postService.getImageUrl(post.image_url);
        if (url) {
          setImageUrl(url);
          setImageError(false);
        } else {
          // URLがnullの場合はエラー状態にする
          setImageUrl(null);
          setImageError(true);
        }
      } catch (error) {
        console.error('画像URL取得エラー:', error);
        setImageUrl(null);
        setImageError(true);
      } finally {
        setImageLoading(false);
      }
    };

    getImageUrl();
  }, [post.image_url, postService]);

  const handleUpdate = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      await onUpdate(post.id, { comment: editComment });
      setIsEditing(false);
    } catch (error) {
      console.error('更新エラー:', error);
      alert(error instanceof Error ? error.message : '更新に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [loading, post.id, editComment, onUpdate]);

  const debouncedHandleUpdate = useCallback(
    debounce(handleUpdate, 300),
    [handleUpdate]
  );

  const handleDelete = useCallback(async () => {
    if (loading) return;
    
    if (!confirm('この投稿を削除しますか？')) return;
    
    setLoading(true);
    try {
      await onDelete(post.id);
    } catch (error) {
      console.error('削除エラー:', error);
      alert(error instanceof Error ? error.message : '削除に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [loading, post.id, onDelete]);

  const debouncedHandleDelete = useCallback(
    debounce(handleDelete, 300),
    [handleDelete]
  );

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* 画像表示部分 */}
      {imageUrl && !imageError && (
        <div className="relative w-full aspect-[4/3] bg-gray-100">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}
          <Image
            src={imageUrl}
            alt="投稿画像"
            fill
            className={`object-cover transition-opacity duration-300 ${
              imageLoading ? 'opacity-0' : 'opacity-100'
            }`}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )}

      {/* 画像エラー表示 */}
      {imageError && post.image_url && (
        <div className="w-full aspect-[4/3] bg-gray-100 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">画像を読み込めませんでした</p>
          </div>
        </div>
      )}

      {/* コンテンツ部分 */}
      <div className="p-4">
        {/* コメント部分 */}
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editComment}
              onChange={(e) => setEditComment(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="コメントを入力..."
            />
            <div className="flex gap-2">
              <button
                onClick={debouncedHandleUpdate}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? '更新中...' : '更新'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditComment(post.comment || '');
                }}
                disabled={loading}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-gray-800 whitespace-pre-wrap">
              {post.comment || 'コメントなし'}
            </p>
            
            {/* 投稿日時 */}
            <p className="text-sm text-gray-500">
              {new Date(post.created_at).toLocaleString('ja-JP')}
            </p>

            {/* アクションボタン */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsEditing(true)}
                disabled={loading}
                className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                編集
              </button>
              <button
                onClick={debouncedHandleDelete}
                disabled={loading}
                className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? '削除中...' : '削除'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 