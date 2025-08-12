// handlers/textHandler.ts
// @ts-nocheck

// ハンズオン4-2: テキストメッセージ処理
// セッション状態に応じたテキストメッセージの処理を行う
import {
  buildFlexMessageWithQuickReply,
  buildPostCancelledFlex,
  buildStartPostGuideFlex,
  buildRequestLocationFlex,
  buildPostCompletedFlex,
} from "../messages/flex/index.ts";
import {
  QA_CAMERA_ROLL,
  QA_LOCATION_CANCEL,
  QA_COMMENT_SKIP_CANCEL,
} from "../messages/quickReplies.ts";
import { ensureUser } from "../services/userService.ts";
import {
  getActiveSession,
  updateSession,
  completePost,
} from "../services/sessionService.ts";
import { sendReply } from "../services/lineMessagingService.ts";

export async function handleText(event: any) {
  const lineUserId = event.source?.userId;
  if (!lineUserId) return;
  const userId = await ensureUser(lineUserId);
  if (!userId) return;
  const messageText = event.message.text;
  const replyToken = event.replyToken;
  const lowerText = messageText.toLowerCase();

  let currentSession = await getActiveSession(lineUserId);

  // ハンズオン4-2: キャンセル処理
  // ユーザーが投稿をキャンセルしたい場合の処理
  if (lowerText.includes("キャンセル") || lowerText.includes("cancel")) {
    if (currentSession) {
      await updateSession(currentSession.id, { status: "cancelled" });
      await sendReply(replyToken, [
        buildFlexMessageWithQuickReply(buildPostCancelledFlex(), { items: QA_CAMERA_ROLL }),
      ]);
    } else {
      await sendReply(replyToken, [
        {
          type: "text",
          text: "現在進行中の投稿はありません。新しい投稿を開始したい場合は、下のボタンをタップしてください。",
          quickReply: { items: QA_CAMERA_ROLL },
        },
      ]);
    }
    return;
  }

  // ハンズオン4-2: コメント入力処理
  // 写真・位置情報の後に、最後のコメント入力を処理
  if (currentSession && currentSession.status === "comment_pending") {
    const comment = messageText === "コメントなし" ? null : messageText;
    const updated = await updateSession(currentSession.id, { temp_comment: comment });
    if (updated) {
      // ハンズオン3-3: DB への投稿データ保存
      const success = await completePost(updated);
      if (success) {
        await sendReply(replyToken, [
          buildPostCompletedFlex({
            image_url: updated.temp_image_url!,
            comment: updated.temp_comment,
            latitude: updated.temp_latitude!,
            longitude: updated.temp_longitude!,
            address: updated.temp_address ?? null,
          }),
        ]);
      } else {
        await sendReply(replyToken, [{ type: "text", text: "投稿の保存に失敗しました。もう一度やり直してください。" }]);
      }
    }
    return;
  }

  // ハンズオン4-2: セッション状態に応じたガイダンス
  // 進行中だが入力が期待と違う場合の処理
  if (currentSession) {
    switch (currentSession.status) {
      case "photo_pending":
        await sendReply(replyToken, [
          buildFlexMessageWithQuickReply(buildStartPostGuideFlex(), { items: QA_CAMERA_ROLL }),
        ]);
        break;
      case "gps_pending":
        await sendReply(replyToken, [
          buildFlexMessageWithQuickReply(buildRequestLocationFlex(), { items: QA_LOCATION_CANCEL }),
        ]);
        break;
      default:
        await sendReply(replyToken, [
          buildFlexMessageWithQuickReply(buildStartPostGuideFlex(), { items: QA_CAMERA_ROLL }),
        ]);
    }
    return;
  }

  // ハンズオン1-2: 初回メッセージ対応
  // セッションなし → 投稿開始案内を表示
  await sendReply(replyToken, [
    buildFlexMessageWithQuickReply(buildStartPostGuideFlex(), { items: QA_CAMERA_ROLL }),
  ]);
}
