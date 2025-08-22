"use client";
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Post } from '../types/database';
import { PostService, PostUpdateData } from '../services/postService';
import { useAuth } from '../contexts/AuthContext';

interface PostCardProps {
  post: Post;
  onUpdate: (id: string, updates: PostUpdateData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function PostCard({ post, onUpdate, onDelete }: PostCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editComment, setEditComment] = useState(post.comment || '');
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const { user } = useAuth();
  const postService = PostService.getInstance();

  useEffect(() => {
    const getImageUrl = async () => {
      if (!user || !post.image_url) {
        setImageUrl(null);
        return;
      }

      setImageUrl(null);
      const url = await postService.getImageUrl(post.image_url);
      setImageUrl(url);
    };

    getImageUrl();
  }, [post.image_url, user]);

  const handleUpdate = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    await onUpdate(post.id, { comment: editComment });
    setIsEditing(false);
    setLoading(false);
  }, [post.id, editComment, onUpdate]);

  const handleDelete = useCallback(async () => {
    if (loading) return;
    
    if (!confirm('この投稿を削除しますか？')) return;
    
    setLoading(true);
    await onDelete(post.id);
    setLoading(false);
  }, [post.id, onDelete]);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {imageUrl && (
        <div className="relative w-full aspect-[4/3] bg-gray-100">
            <Image
              src={imageUrl}
              alt="投稿画像"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
        </div>
      )}

      <div className="p-4">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editComment}
              onChange={(e) => setEditComment(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="コメントを入力..."
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleUpdate}
                disabled={loading}
                className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? '保存中...' : '保存'}
              </button>
              <button
                onClick={() => {
                  setEditComment(post.comment || '');
                  setIsEditing(false);
                }}
                disabled={loading}
                className="px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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
            
            <p className="text-sm text-gray-500">
              {new Date(post.created_at).toLocaleString('ja-JP')}
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsEditing(true)}
                disabled={loading}
                className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                編集
              </button>
              <button
                onClick={handleDelete}
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