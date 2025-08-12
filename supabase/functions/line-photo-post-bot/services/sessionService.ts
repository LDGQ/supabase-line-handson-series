// services/sessionService.ts
// @ts-nocheck

// ハンズオン4-2: セッション管理サービス
// 投稿フローのセッション状態を管理（photo_pending → gps_pending → comment_pending → completed）
import { supabaseAdmin } from "./supabaseClient.ts";
import { PostSession } from "../utils/types.ts";

// ハンズオン4-2: アクティブセッションの取得
// completed/cancelled 以外で有効期限内のセッションを取得
export async function getActiveSession(lineUserId: string): Promise<PostSession | null> {
  if (!supabaseAdmin) return null;
  const { data: session } = await supabaseAdmin
    .from("post_sessions")
    .select("*")
    .eq("line_user_id", lineUserId)
    .neq("status", "completed")
    .neq("status", "cancelled")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return session;
}

// ハンズオン4-2: 新規セッションの作成
// 既存の未完了セッションをキャンセルし、新しい photo_pending セッションを作成
export async function createNewSession(lineUserId: string, userId: string): Promise<PostSession | null> {
  if (!supabaseAdmin) return null;
  // 既存の未完了セッションをキャンセル
  await supabaseAdmin
    .from("post_sessions")
    .update({ status: "cancelled" })
    .eq("line_user_id", lineUserId)
    .neq("status", "completed")
    .neq("status", "cancelled");
  // 新規セッション作成
  const { data: session } = await supabaseAdmin
    .from("post_sessions")
    .insert({ line_user_id: lineUserId, user_id: userId, status: "photo_pending" })
    .select()
    .single();
  return session;
}

// ハンズオン4-2: セッションの更新
// 状態遷移や一時データの保存を行う
export async function updateSession(sessionId: string, updates: Partial<PostSession>): Promise<PostSession | null> {
  if (!supabaseAdmin) return null;
  const { data: session } = await supabaseAdmin
    .from("post_sessions")
    .update(updates)
    .eq("id", sessionId)
    .select()
    .single();
  return session;
}

// ハンズオン3-3: 投稿の完了処理
// ハンズオン4-2: セッションデータを posts テーブルに保存してセッションを完了状態にする
export async function completePost(session: PostSession): Promise<boolean> {
  if (!supabaseAdmin) return false;
  try {
    // posts テーブルに投稿データを挿入
    const { error: postError } = await supabaseAdmin
      .from("posts")
      .insert({
        user_id: session.user_id,
        image_url: session.temp_image_url,
        latitude: session.temp_latitude,
        longitude: session.temp_longitude,
        comment: session.temp_comment,
        address: session.temp_address,
      });
    if (postError) {
      console.error("posts insert error", postError);
      return false;
    }
    // セッションを完了状態に更新
    await supabaseAdmin
      .from("post_sessions")
      .update({ status: "completed" })
      .eq("id", session.id);
    return true;
  } catch (e) {
    console.error("completePost error", e);
    return false;
  }
}
