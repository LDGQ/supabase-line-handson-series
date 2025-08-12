export const buildPhotoReceivedFlex = () => ({
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
          text: "✅\n写真を受信しました",
          weight: "bold",
          size: "xl",
          wrap: true,
          align: "center",
        },
        {
          type: "text",
          text: "次に位置情報を送信してください",
          size: "sm",
          color: "#666666",
          margin: "lg",
          wrap: true,
        },
      ],
    },
  },
});
