export const buildFlexMessageWithQuickReply = (flex: any, quickReply?: { items: any[] }) => {
  if (!quickReply) return flex;
  return {
    ...flex,
    quickReply,
  };
};
