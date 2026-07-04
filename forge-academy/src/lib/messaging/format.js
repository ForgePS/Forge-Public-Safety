export function formatMessageTime(createdAt) {
  if (!createdAt?.toDate) return "";
  const date = createdAt.toDate();
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function formatConversationPreview(text, attachmentCount = 0) {
  if (text?.trim()) return text.trim();
  if (attachmentCount > 0) {
    return attachmentCount === 1 ? "Shared a file" : `Shared ${attachmentCount} files`;
  }
  return "No messages yet";
}
