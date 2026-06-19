import { useEffect, useState } from "react";
import {
  formatAnnouncementDate,
  listPortalAnnouncements,
} from "../lib/portalAnnouncements.js";

/**
 * @param {{
 *   audience: string,
 *   limit?: number,
 *   className?: string,
 *   title?: string,
 * }} props
 */
export default function PortalAnnouncementsPanel({
  audience,
  limit = 5,
  className = "",
  title = "Recent Announcements",
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    listPortalAnnouncements({ audience, activeOnly: true, limit })
      .then((rows) => {
        if (active) setItems(rows);
      })
      .catch(() => {
        if (active) setItems([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [audience, limit]);

  return (
    <section
      className={`rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] p-5 shadow-sm ${className}`}
    >
      <h2 className="mb-4 text-sm font-semibold text-[var(--color-afta-text)]">{title}</h2>

      {loading ? (
        <p className="text-sm text-[var(--color-afta-muted)]">Loading announcements…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--color-afta-muted)]">No announcements right now.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="border-b border-[var(--color-afta-border)] pb-3 last:border-0 last:pb-0"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">
                {formatAnnouncementDate(item.publishedAt)}
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-afta-text)]">{item.title}</p>
              {item.detail ? (
                <p className="mt-1 text-xs text-[var(--color-afta-muted)]">{item.detail}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
