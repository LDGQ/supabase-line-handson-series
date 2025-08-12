export function buildPostCancelledFlex() {
  return {
    type: "flex",
    altText: "投稿をキャンセルしました",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "❌ 投稿をキャンセルしました",
            weight: "bold",
            size: "xl",
            wrap: true,
            align: "center",
          },
        ],
      },
    },
  };
}
