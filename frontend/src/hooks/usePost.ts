// ハンズオン3-4: 投稿データ管理カスタムフック
// 投稿の取得・更新・削除機能を提供
import { useEffect, useState, useCallback } from 'react';
import { Post } from '../types/database';
import { PostService, PostUpdateData } from '../services/postService';

export type UsePostReturn = {
  posts: Post[];
  loading: boolean;
  error: Error | null;
  deletePost: (postId: string) => Promise<void>;
  updatePost: (postId: string, updates: PostUpdateData) => Promise<void>;
  refreshPosts: () => Promise<void>;
};

export function usePost(): UsePostReturn {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const postService = PostService.getInstance();

  // ハンズオン3-4: 投稿データ取得
  // Supabase から投稿一覧を取得してState更新
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const posts = await postService.getPosts();
      setPosts(posts);
    } catch (err) {
      console.error('投稿の取得に失敗しました:', err);
      setError(err instanceof Error ? err : new Error('投稿の取得に失敗しました'));
    } finally {
      setLoading(false);
    }
  }, [postService]);

  const refreshPosts = useCallback(async () => {
    await fetchPosts();
  }, [fetchPosts]);

  // Update/Delete系メソッド
  const updatePost = useCallback(async (postId: string, updates: PostUpdateData) => {
    try {
      setError(null);
      const updatedPost = await postService.updatePost(postId, updates);
      
      // 更新成功後、投稿一覧を更新
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId ? updatedPost : post
        )
      );
    } catch (err) {
      console.error('投稿の更新に失敗しました:', err);
      const error = err instanceof Error ? err : new Error('投稿の更新に失敗しました');
      setError(error);
      throw error;
    }
  }, [postService]);

  const deletePost = useCallback(async (postId: string) => {
    try {
      setError(null);
      await postService.deletePost(postId);
      
      // 削除成功後、投稿一覧を更新
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    } catch (err) {
      console.error('投稿の削除に失敗しました:', err);
      const error = err instanceof Error ? err : new Error('投稿の削除に失敗しました');
      setError(error);
      throw error;
    }
  }, [postService]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return { 
    posts, 
    loading, 
    error, 
    deletePost, 
    updatePost, 
    refreshPosts 
  };
} 