export function buildGpsReceivedFlex() {
  return {
    type: "flex",
    altText: "位置情報を受信しました",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "✅\n位置情報を受信しました",
            weight: "bold",
            size: "xl",
            wrap: true,
            align: "center",
          },
          {
            type: "text",
            text: "最後にコメントを入力してください（任意）",
            size: "sm",
            color: "#666666",
            margin: "lg",
            wrap: true,
          },
        ],
      },
    },
  };
}
