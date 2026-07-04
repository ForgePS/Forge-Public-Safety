import { MessageSquare } from "lucide-react";
import { useMessagingOptional } from "../../context/MessagingContext.jsx";

export default function MessagingLauncher() {
  const messaging = useMessagingOptional();
  if (!messaging?.enabled) return null;

  const { expand, unreadCount, notificationPrefs } = messaging;
  const showBadge = notificationPrefs.badgeEnabled && unreadCount > 0;

  return (
    <button
      type="button"
      onClick={expand}
      className="relative rounded-lg border border-[var(--color-afta-border)] p-2 text-[var(--color-afta-muted)] hover:bg-slate-50"
      aria-label={`Messages${showBadge ? `, ${unreadCount} unread` : ""}`}
    >
      <MessageSquare className="h-4 w-4" />
      {showBadge ? (
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--color-afta-red)] px-1 text-[9px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </button>
  );
}
