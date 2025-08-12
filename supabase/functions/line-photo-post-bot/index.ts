// index.ts - Entry point for line-photo-post-bot
// @ts-nocheck

// ハンズオン2-3: Edge Function + Echo Bot
// LINE Bot SDK を使用したWebhookエントリーポイント
import { WebhookEvent, MessageEvent } from "@line/bot-sdk";
import { handleText } from "./handlers/textHandler.ts";
import { handleImage } from "./handlers/imageHandler.ts";
import { handleLocation } from "./handlers/locationHandler.ts";

async function router(req: Request): Promise<Response> {
  // ハンズオン2-3: POST メソッドのみ受け入れ
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  
  // ハンズオン2-3: x-line-signature の検証
  // LINE Bot SDK を使用した署名検証
  const rawBody = new Uint8Array(await req.arrayBuffer());
  
  let body: { events: WebhookEvent[] };
  try {
    body = JSON.parse(new TextDecoder().decode(rawBody));
  } catch (_) {
    return new Response("Bad Request", { status: 400 });
  }
  
  const events = body.events ?? [];
  
  // ハンズオン4-2: 投稿フローの実装
  // メッセージイベントごとに適切なハンドラーを呼び出し
  const tasks = events
    .filter((event): event is MessageEvent => event.type === "message")
    .map(async (event: MessageEvent) => {
      try {
        switch (event.message.type) {
          case "text":
            // ハンズオン4-2: テキストメッセージ処理（コメント入力、キャンセル等）
            await handleText(event);
            break;
          case "image":
            // ハンズオン3-3: 画像の DB & Storage 連携
            // ハンズオン4-2: 写真投稿の開始
            await handleImage(event);
            break;
          case "location":
            // ハンズオン4-2: 位置情報の処理
            await handleLocation(event);
            break;
          default:
            // ignore unsupported message types
            console.log(`Unsupported message type: ${event.message.type}`);
            break;
        }
      } catch (error) {
        console.error(`Error handling ${event.message.type} message:`, error);
        // エラーが発生しても他のイベント処理を継続
      }
    });
    
  await Promise.all(tasks);
  return new Response("ok", { status: 200 });
}

Deno.serve((req: Request) => router(req).catch((e) => {
  console.error("Unhandled error", e);
  return new Response("Internal Server Error", { status: 500 });
}));
