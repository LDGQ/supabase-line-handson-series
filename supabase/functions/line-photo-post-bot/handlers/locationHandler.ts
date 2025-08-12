// handlers/locationHandler.ts
// @ts-nocheck

// ハンズオン4-2: 位置情報の処理
// 写真の後に送信される位置情報を処理し、コメント入力段階へ進む
import {
  buildFlexMessageWithQuickReply,
  buildGpsReceivedFlex,
} from "../messages/flex/index.ts";
import { QA_COMMENT_SKIP_CANCEL } from "../messages/quickReplies.ts";
import { ensureUser } from "../services/userService.ts";
import {
  getActiveSession,
  updateSession,
} from "../services/sessionService.ts";
import { sendReply } from "../services/lineMessagingService.ts";

export async function handleLocation(event: any) {
  const lineUserId = event.source?.userId;
  if (!lineUserId) return;
  const userId = await ensureUser(lineUserId);
  if (!userId) return;
  const replyToken = event.replyToken;

  // ハンズオン4-2: セッション状態の確認
  // gps_pending 状態のセッションが存在するかチェック
  const currentSession = await getActiveSession(lineUserId);
  if (!currentSession) {
    await sendReply(replyToken, [{ type: "text", text: "投稿を開始するには写真を送信してください。" }]);
    return;
  }
  if (currentSession.status !== "gps_pending") {
    await sendReply(replyToken, [{ type: "text", text: "現在は位置情報を受け付けていません。" }]);
    return;
  }

  // ハンズオン4-2: 位置情報の保存とセッション状態更新
  // 緯度・経度・住所を一時保存し、次のステップ（コメント入力）へ
  const { latitude, longitude, address } = event.message;
  await updateSession(currentSession.id, {
    temp_latitude: latitude,
    temp_longitude: longitude,
    temp_address: address ?? null,
    status: "comment_pending",
  });
  await sendReply(replyToken, [
    buildFlexMessageWithQuickReply(buildGpsReceivedFlex(), { items: QA_COMMENT_SKIP_CANCEL }),
  ]);
}
