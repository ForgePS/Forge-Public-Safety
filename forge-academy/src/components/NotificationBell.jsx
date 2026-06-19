import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import {
  countUnreadNotifications,
  formatNotificationTime,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
  syncMyNotifications,
} from "../lib/notifications.js";

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  const unreadCount = countUnreadNotifications(rows);

  useEffect(() => {
    if (!user?.uid) return undefined;

    let active = true;
    setSyncing(true);
    syncMyNotifications()
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to refresh notifications.");
        }
      })
      .finally(() => {
        if (active) setSyncing(false);
      });

    const unsubscribe = subscribeToNotifications(user.uid, (nextRows) => {
      if (active) setRows(nextRows);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!open) return undefined;

    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleRefresh() {
    if (!user?.uid) return;
    setSyncing(true);
    setError(null);
    try {
      await syncMyNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to refresh notifications.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleOpenPanel() {
    setOpen((current) => !current);
    if (!open) await handleRefresh();
  }

  async function handleNotificationClick(notification) {
    if (!notification.read) {
      await markNotificationRead(notification.id);
    }
    setOpen(false);
    if (notification.link) navigate(notification.link);
  }

  async function handleMarkAllRead() {
    if (!user?.uid || unreadCount === 0) return;
    await markAllNotificationsRead(user.uid);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={handleOpenPanel}
        className="relative rounded-lg border border-[var(--color-afta-border)] p-2 text-[var(--color-afta-muted)] hover:bg-slate-50"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--color-afta-red)] px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,360px)] overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-lg">
          <div className="flex items-center justify-between border-b border-[var(--color-afta-border)] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[var(--color-afta-text)]">Notifications</p>
              <p className="text-[11px] text-[var(--color-afta-muted)]">
                {syncing ? "Refreshing…" : `${unreadCount} unread`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={syncing}
                className="text-[11px] font-semibold text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)] disabled:opacity-50"
              >
                Refresh
              </button>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-semibold text-[#c8102e] hover:underline"
                >
                  Mark all read
                </button>
              ) : null}
            </div>
          </div>

          {error ? (
            <p className="border-b border-[var(--color-afta-border)] px-4 py-3 text-xs text-red-700">{error}</p>
          ) : null}

          <div className="max-h-80 overflow-y-auto">
            {rows.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[var(--color-afta-subtle)]">
                {syncing ? "Loading notifications…" : "You're all caught up."}
              </p>
            ) : (
              rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => handleNotificationClick(row)}
                  className={`block w-full border-b border-[var(--color-afta-border)] px-4 py-3 text-left transition hover:bg-slate-50 ${
                    row.read ? "opacity-70" : "bg-red-50/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--color-afta-text)]">{row.title}</p>
                    {!row.read ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#c8102e]" /> : null}
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-afta-subtle)]">{row.body}</p>
                  <p className="mt-2 text-[10px] text-[var(--color-afta-muted)]">
                    {formatNotificationTime(row.createdAt)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
