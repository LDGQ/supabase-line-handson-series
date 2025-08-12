// services/userService.ts
// @ts-nocheck
import { env } from "../utils/env.ts";
import { supabaseAdmin } from "./supabaseClient.ts";

export async function ensureUser(lineUserId: string): Promise<string | null> {
  if (!supabaseAdmin) return null;

  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  if (existing) return existing.id as string;

  // LINE プロフィール取得
  let displayName: string | null = null;
  let avatarUrl: string | null = null;
  try {
    const profRes = await fetch(
      `https://api.line.me/v2/bot/profile/${lineUserId}`,
      {
        headers: {
          Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
      },
    );
    if (profRes.ok) {
      const p = await profRes.json();
      displayName = p.displayName ?? null;
      avatarUrl = p.pictureUrl ?? null;
    }
  } catch (_) {
    // ignore
  }

  // Auth ユーザ作成
  let newUid: string | undefined;
  try {
    const { data: newUser, error: createError } = await supabaseAdmin!.auth.admin.createUser({
      email: `${lineUserId}@line.user`,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: { line_user_id: lineUserId },
    });
    if (createError) {
      console.error("createUser error", createError.message);
      const { data: existingUser } = await supabaseAdmin!.auth.admin.listUsers({
        email: `${lineUserId}@line.user`,
        limit: 1,
      });
      newUid = existingUser?.users?.[0]?.id;
    } else {
      newUid = newUser?.user?.id;
    }
  } catch (e) {
    console.error("auth admin create error", e);
  }
  if (!newUid) {
    console.error("Failed to resolve UID for", lineUserId);
    return null;
  }
  // users テーブルに UPSERT
  const { error: upsertErr } = await supabaseAdmin
    .from("users")
    .upsert(
      {
        id: newUid,
        line_user_id: lineUserId,
        display_name: displayName,
        avatar_url: avatarUrl,
      },
      { onConflict: "line_user_id" },
    );
  if (upsertErr) console.error("users upsert error", upsertErr);
  return newUid;
}
