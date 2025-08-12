export const buildStartPostGuideFlex = () => ({
  type: "flex",
  altText: "写真投稿ガイド",
  contents: {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "📸\n写真投稿ガイド",
          weight: "bold",
          size: "xl",
          wrap: true,
          align: "center",
        },
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          contents: [
            {
              type: "text",
              text: "1️⃣ 写真を送信",
              weight: "bold",
              size: "md",
            },
            {
              type: "text",
              text: "カメラで撮影するか、写真を選択してください",
              size: "sm",
              color: "#666666",
              margin: "sm",
              wrap: true,
            },
          ],
        },
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          contents: [
            {
              type: "text",
              text: "2️⃣ 位置情報を共有",
              weight: "bold",
              size: "md",
            },
            {
              type: "text",
              text: "写真を撮影した場所の位置情報を送信します",
              size: "sm",
              color: "#666666",
              margin: "sm",
              wrap: true,
            },
          ],
        },
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          contents: [
            {
              type: "text",
              text: "3️⃣ コメントを入力",
              weight: "bold",
              size: "md",
            },
            {
              type: "text",
              text: "写真についてのコメントを入力できます",
              size: "sm",
              color: "#666666",
              margin: "sm",
              wrap: true,
            },
          ],
        },
      ],
    },
  },
});
