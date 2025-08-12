// @ts-nocheck
// Import edge runtime types for better DX (ignored at runtime)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// utils/env.ts
// 環境変数を取得してまとめてエクスポートするユーティリティ

export const env = {
  LINE_CHANNEL_ACCESS_TOKEN: Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN")!,
  LINE_CHANNEL_SECRET: Deno.env.get("LINE_CHANNEL_SECRET")!,
  SUPABASE_URL: Deno.env.get("SUPABASE_URL")!,
  SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY")!,
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? undefined,
  IMAGE_BUCKET: "post-images",
};

if (!env.LINE_CHANNEL_ACCESS_TOKEN || !env.LINE_CHANNEL_SECRET || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
  throw new Error("Required environment variables are missing for line-photo-post-bot function.");
}
