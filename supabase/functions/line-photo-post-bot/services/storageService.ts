// services/storageService.ts
// @ts-nocheck

// ハンズオン3-3: Storage サービス
// LINE Content API から画像を取得し、Supabase Storage にアップロード
import { env } from "../utils/env.ts";
import { supabaseAdmin } from "./supabaseClient.ts";

// ハンズオン3-3: 画像アップロード処理
// LINE Content API → Storage → 署名付き URL 生成の一連の流れ
export async function uploadImage(lineUserId: string, messageId: string): Promise<string | null> {
  if (!supabaseAdmin) return null;
  try {
    // LINE Content API から画像バイナリを取得
    const contentRes = await fetch(
      `https://api-data.line.me/v2/bot/message/${messageId}/content`,
      {
        headers: {
          Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
      },
    );
    if (!contentRes.ok) return null;
    
    // バイナリデータとファイル情報の準備
    const buffer = await contentRes.arrayBuffer();
    const mime = contentRes.headers.get("content-type") ?? "image/jpeg";
    const ext = mime.split("/")[1] || "jpg";
    const fileName = `${messageId}.${ext}`;
    const objectPath = `${lineUserId}/${fileName}`;
    
    // Supabase Storage にアップロード
    const { error: uploadErr } = await supabaseAdmin.storage
      .from(env.IMAGE_BUCKET)
      .upload(objectPath, buffer, { contentType: mime, upsert: true });
    if (uploadErr) {
      console.error("storage upload error", uploadErr);
      return null;
    }
    
    // 署名付き URL の生成（7日間有効）
    const { data: signed } = await supabaseAdmin.storage
      .from(env.IMAGE_BUCKET)
      .createSignedUrl(objectPath, 60 * 60 * 24 * 7);
    return signed?.signedUrl || null;
  } catch (e) {
    console.error("uploadImage error", e);
    return null;
  }
}
