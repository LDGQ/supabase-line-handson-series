// services/lineMessagingService.ts
// @ts-nocheck
import { Client, Message } from "@line/bot-sdk";
import { env } from "../utils/env.ts";

// LINE Bot SDK Clientの初期化
const lineClient = new Client({
  channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: env.LINE_CHANNEL_SECRET,
});

export async function sendReply(replyToken: string, messages: Message[]) {
  if (!messages.length) return;
  
  try {
    await lineClient.replyMessage(replyToken, messages);
  } catch (error) {
    console.error("LINE reply error:", error);
    throw error;
  }
}

// 追加のメッセージ送信メソッド（必要に応じて）
export async function pushMessage(to: string, messages: Message[]) {
  if (!messages.length) return;
  
  try {
    await lineClient.pushMessage(to, messages);
  } catch (error) {
    console.error("LINE push message error:", error);
    throw error;
  }
}

// プロフィール取得メソッド
export async function getUserProfile(userId: string) {
  try {
    return await lineClient.getProfile(userId);
  } catch (error) {
    console.error("Get user profile error:", error);
    throw error;
  }
}

// リッチメニューの設定（必要に応じて）
export async function setRichMenu(userId: string, richMenuId: string) {
  try {
    await lineClient.linkRichMenuToUser(userId, richMenuId);
  } catch (error) {
    console.error("Set rich menu error:", error);
    throw error;
  }
}
