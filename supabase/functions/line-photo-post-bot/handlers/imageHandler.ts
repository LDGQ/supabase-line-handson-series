// handlers/imageHandler.ts
// @ts-nocheck

// ハンズオン3-3: 画像の DB & Storage 連携
// ハンズオン4-2: 写真投稿フローの開始
// LINE から送信された画像を Storage にアップロードし、投稿セッションを開始
import {
  buildFlexMessageWithQuickReply,
  buildPhotoReceivedFlex,
} from "../messages/flex/index.ts";
import { QA_LOCATION_CANCEL } from "../messages/quickReplies.ts";
import { ensureUser } from "../services/userService.ts";
import {
  getActiveSession,
  createNewSession,
  updateSession,
} from "../services/sessionService.ts";
import { uploadImage } from "../services/storageService.ts";
import { sendReply } from "../services/lineMessagingService.ts";

export async function handleImage(event: any) {
  const lineUserId = event.source?.userId;
  if (!lineUserId) return;
  const userId = await ensureUser(lineUserId);
  if (!userId) return;
  const replyToken = event.replyToken;

  // ハンズオン4-2: セッション管理
  // 新規セッション作成または既存セッションの取得
  let currentSession = await getActiveSession(lineUserId);
  if (!currentSession) {
    currentSession = await createNewSession(lineUserId, userId);
    if (!currentSession) {
      await sendReply(replyToken, [{ type: "text", text: "投稿セッションの作成に失敗しました。もう一度やり直してください。" }]);
      return;
    }
  }
  if (currentSession.status !== "photo_pending") {
    await sendReply(replyToken, [{ type: "text", text: "現在は写真を受け付けていません。" }]);
    return;
  }

  // ハンズオン3-3: Storage への画像アップロード
  // LINE Content API から画像を取得し、Supabase Storage にアップロード
  const imageUrl = await uploadImage(lineUserId, event.message.id);
  if (!imageUrl) {
    await sendReply(replyToken, [{ type: "text", text: "画像のアップロードに失敗しました。もう一度やり直してください。" }]);
    return;
  }

  // ハンズオン4-2: セッション状態を gps_pending に更新
  // 次のステップ（位置情報入力）へ進む
  await updateSession(currentSession.id, { temp_image_url: imageUrl, status: "gps_pending" });
  await sendReply(replyToken, [
    buildFlexMessageWithQuickReply(buildPhotoReceivedFlex(), { items: QA_LOCATION_CANCEL }),
  ]);
}
