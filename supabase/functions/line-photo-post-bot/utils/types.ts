// utils/types.ts
// LINE Bot SDK の型定義をre-export
export type {
  WebhookEvent,
  MessageEvent,
  TextMessage,
  ImageMessage,
  LocationMessage,
  Message,
  TextMessage as LineTextMessage,
  FlexMessage,
  QuickReply,
  Profile,
} from "@line/bot-sdk";

export type SessionStatus =
  | "photo_pending"
  | "gps_pending"
  | "comment_pending"
  | "completed"
  | "cancelled";

export interface PostSession {
  id: string;
  user_id: string;
  line_user_id: string;
  status: SessionStatus;
  temp_image_url?: string;
  temp_latitude?: number;
  temp_longitude?: number;
  temp_comment?: string;
  temp_address?: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}
