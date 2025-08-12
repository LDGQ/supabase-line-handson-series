export const QA_CAMERA_ROLL = [
  {
    type: "action",
    action: {
      type: "camera",
      label: "📷 カメラ",
    },
  },
  {
    type: "action",
    action: {
      type: "cameraRoll",
      label: "🖼️ 写真選択",
    },
  },
] as const;

export const QA_LOCATION_CANCEL = [
  {
    type: "action",
    action: {
      type: "location",
      label: "📍 位置情報",
    },
  },
  {
    type: "action",
    action: {
      type: "message",
      label: "❌ キャンセル",
      text: "キャンセル",
    },
  },
] as const;

export const QA_COMMENT_SKIP_CANCEL = [
  {
    type: "action",
    action: {
      type: "message",
      label: "💬 コメントなし",
      text: "コメントなし",
    },
  },
  {
    type: "action",
    action: {
      type: "message",
      label: "❌ キャンセル",
      text: "キャンセル",
    },
  },
] as const; 