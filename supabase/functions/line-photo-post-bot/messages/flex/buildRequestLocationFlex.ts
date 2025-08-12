import { QA_LOCATION_CANCEL } from "../quickReplies.ts";
export const buildRequestLocationFlex = () => ({
  type: "flex",
  altText: "位置情報を送信してください",
  contents: {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "📍\n位置情報を送信",
          weight: "bold",
          size: "xl",
          wrap: true,
          align: "center",
        },
        {
          type: "text",
          text: "写真を撮影した場所の位置情報を送信してください",
          size: "sm",
          color: "#666666",
          margin: "md",
          wrap: true,
        },
      ],
    },
    quickReply: { items: QA_LOCATION_CANCEL },
  },
});
