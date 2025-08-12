export const buildPostCompletedFlex = (post: {
  image_url: string;
  comment: string | null;
  latitude: number;
  longitude: number;
  address?: string | null;
}) => {
  const contents: any[] = [
    {
      type: "text",
      text: "🎉 投稿が完了しました！",
      weight: "bold",
      size: "xl",
      wrap: true,
      align: "center",
      color: "#1DB446",
    },
    {
      type: "separator",
      margin: "md",
    },
    {
      type: "text",
      text: "📝 コメント",
      weight: "bold",
      size: "sm",
      color: "#333333",
    },
    {
      type: "text",
      text: post.comment ?? "なし",
      size: "sm",
      color: "#666666",
      wrap: true,
    },
  ];

  if (post.address) {
    contents.push(
      {
        type: "separator",
        margin: "md",
      },
      {
        type: "text",
        text: "📍 場所",
        weight: "bold",
        size: "sm",
        color: "#333333",
      },
      {
        type: "text",
        text: post.address,
        size: "sm",
        color: "#666666",
        wrap: true,
      },
    );
  }

  return {
    type: "flex",
    altText: "投稿が完了しました 🎉",
    contents: {
      type: "bubble",
      hero: {
        type: "image",
        url: post.image_url,
        size: "full",
        aspectRatio: "1:1",
        aspectMode: "cover",
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents,
      },
    },
  };
};
