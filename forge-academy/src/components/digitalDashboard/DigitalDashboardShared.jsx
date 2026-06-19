import { useState } from "react";
import { CalendarClock, Check, Copy, ExternalLink, Film, LayoutTemplate, MonitorPlay, MonitorSmartphone, QrCode } from "lucide-react";
import { buildDisplayPlayerUrl, filterPhysicalDisplays } from "../../lib/digitalDashboard.js";

/** MVIX-style primary module shortcuts */
export const FORGE_DISPLAYS_PRIMARY_NAV = [
  { id: "devices", label: "Devices", icon: MonitorSmartphone },
  { id: "virtualPlayer", label: "Virtual Player", icon: MonitorPlay, settingFlag: "digitalDashboard.virtualPlayerEnabled" },
  { id: "media", label: "Media", icon: Film },
  { id: "playlists", label: "Playlists", icon: MonitorPlay },
  { id: "layouts", label: "Templates", icon: LayoutTemplate },
  { id: "schedules", label: "Publish", icon: CalendarClock },
];

/** @type {{ id: string, label: string, group: string }[]} */
export const DASHBOARD_VIEW_GROUPS = [
  { id: "overview", label: "Overview", group: "Network" },
  { id: "displays", label: "Displays", group: "Network" },
  { id: "devices", label: "Devices", group: "Network" },
  { id: "virtualPlayer", label: "Virtual Player", group: "Network" },
  { id: "groups", label: "Groups", group: "Network" },
  { id: "media", label: "Media", group: "Content" },
  { id: "playlists", label: "Playlists", group: "Content" },
  { id: "layouts", label: "Layouts", group: "Content" },
  { id: "widgets", label: "Widgets", group: "Content" },
  { id: "dining", label: "Dining", group: "Content" },
  { id: "schedules", label: "Schedules", group: "Publishing" },
  { id: "alerts", label: "Alerts", group: "Publishing" },
  { id: "analytics", label: "Analytics", group: "Insights" },
  { id: "platform", label: "Platform", group: "Insights" },
];

export const AMAZON_SIGNAGE_STICK_STEPS = [
  "Register the display in Forge Displays and save to generate a player URL.",
  "On the Amazon Signage Stick, open the browser or Signage Stick kiosk app.",
  "Enter the player URL as the home / startup page (HTTPS required in production).",
  "Set display orientation to match the display record (landscape or portrait).",
  "Disable sleep / screensaver so the stick stays on the player page.",
  "The player polls automatically — no app install required on the stick.",
];

/**
 * @param {{ url: string, compact?: boolean }} props
 */
export function PlayerUrlField({ url, compact = false }) {
  const [copied, setCopied] = useState(false);

  async function copyUrl() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("textarea");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!url) {
    return (
      <p className="rounded-[10px] border border-dashed border-[var(--color-afta-border)] bg-slate-50 px-4 py-3 text-xs text-[var(--color-afta-muted)]">
        Save this display to generate the player URL for Amazon Signage Stick and other web players.
      </p>
    );
  }

  const qrSrc = `https://quickchart.io/qr?size=160&margin=1&text=${encodeURIComponent(url)}`;

  return (
    <div className={`rounded-[12px] border border-[var(--color-afta-border)] bg-slate-50 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-afta-muted)]">
            Player URL · Amazon Signage Stick compatible
          </p>
          <input
            className="app-input mt-2 font-mono text-xs"
            readOnly
            value={url}
            onFocus={(event) => event.target.select()}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="app-btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs" onClick={copyUrl}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy URL"}
            </button>
            <a href={url} target="_blank" rel="noopener noreferrer" className="app-btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs">
              <ExternalLink className="h-3.5 w-3.5" />
              Open player
            </a>
          </div>
        </div>
        {!compact ? (
          <div className="rounded-[10px] border border-[var(--color-afta-border)] bg-white p-2 text-center">
            <img src={qrSrc} alt="QR code for player URL" className="mx-auto h-[120px] w-[120px]" width={120} height={120} />
            <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">
              <QrCode className="h-3 w-3" />
              Scan to open
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * @param {{ displays?: Array<{ id?: string, name?: string, publicKey?: string, location?: string }> }} props
 */
export function SignageStickProvisioningGuide({ displays = [] }) {
  const provisioned = filterPhysicalDisplays(displays).filter((item) => item.id && item.publicKey);

  return (
    <section className="app-panel overflow-hidden">
      <header className="border-b border-[var(--color-afta-border)] px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--color-afta-red)]/10 text-[var(--color-afta-red)]">
            <MonitorPlay className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-afta-text)]">Amazon Signage Stick setup</h3>
            <p className="mt-0.5 text-xs text-[var(--color-afta-muted)]">
              Forge Displays uses a web player — point any Signage Stick, Fire TV, or kiosk browser at your player URL. No MVIX license required.
            </p>
          </div>
        </div>
      </header>
      <div className="grid gap-5 p-4 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">Quick setup</p>
          <ol className="mt-3 space-y-2 text-sm text-[var(--color-afta-text)]">
            {AMAZON_SIGNAGE_STICK_STEPS.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--color-afta-red)] text-xs font-bold text-white">
                  {index + 1}
                </span>
                <span className="pt-0.5 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">Registered player URLs</p>
          {provisioned.length ? (
            provisioned.map((display) => (
              <div key={display.id}>
                <p className="mb-1 text-xs font-semibold text-[var(--color-afta-text)]">
                  {display.name}
                  {display.location ? <span className="font-normal text-[var(--color-afta-muted)]"> · {display.location}</span> : null}
                </p>
                <PlayerUrlField url={buildDisplayPlayerUrl(display.id, display.publicKey)} compact />
              </div>
            ))
          ) : (
            <p className="rounded-[10px] border border-dashed border-[var(--color-afta-border)] px-4 py-6 text-center text-sm text-[var(--color-afta-muted)]">
              Add and save a display to generate Signage Stick player URLs.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * @param {{
 *   items: { id: string, label: string, icon: import('react').ComponentType<{ className?: string }> }[],
 *   activeView: string,
 *   onViewChange: (id: string) => void,
 * }} props
 */
export function ForgeDisplaysPrimaryNav({ items, activeView, onViewChange }) {
  return (
    <nav className="flex flex-wrap gap-1 rounded-[14px] border border-[var(--color-afta-border)] bg-white p-1.5 shadow-sm">
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onViewChange(id)}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-semibold transition-colors sm:flex-none ${
            activeView === id
              ? "bg-[var(--color-afta-red)] text-white shadow-sm"
              : "text-[var(--color-afta-muted)] hover:bg-slate-50 hover:text-[var(--color-afta-text)]"
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </nav>
  );
}

/**
 * @param {{
 *   groups: { label: string, views: { id: string, label: string, icon: import('react').ComponentType<{ className?: string }> }[] }[],
 *   activeView: string,
 *   onViewChange: (id: string) => void,
 * }} props
 */
export function DigitalDashboardNav({ groups, activeView, onViewChange }) {
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-afta-muted)]">
            {group.label}
          </p>
          <nav className="flex flex-wrap gap-1 rounded-[12px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] p-1">
            {group.views.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onViewChange(id)}
                className={`inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-xs font-semibold transition-colors ${
                  activeView === id
                    ? "bg-[var(--color-afta-red)] text-white shadow-sm"
                    : "text-[var(--color-afta-muted)] hover:bg-slate-50 hover:text-[var(--color-afta-text)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      ))}
    </div>
  );
}
