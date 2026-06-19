import { useEffect, useMemo, useState } from "react";
import { ExternalLink, MonitorPlay, RefreshCw } from "lucide-react";
import {
  buildVirtualPlayerUrl,
  defaultDisplayForm,
  displayTypeLabel,
  isVirtualDisplay,
  VIRTUAL_PLAYER_DISPLAY_ID,
} from "../../lib/digitalDashboard.js";
import { PlayerUrlField } from "./DigitalDashboardShared.jsx";

/**
 * @param {{
 *   virtualDisplay: Record<string, unknown> | null,
 *   physicalDisplays?: Record<string, unknown>[],
 *   playlists?: Record<string, unknown>[],
 *   layouts?: Record<string, unknown>[],
 *   groups?: Record<string, unknown>[],
 *   canEdit?: boolean,
 *   onEnsureVirtual?: () => Promise<Record<string, unknown> | null>,
 *   onSaveDisplay?: (record: Record<string, unknown>) => Promise<void>,
 * }} props
 */
export default function VirtualPlayerSection({
  virtualDisplay,
  physicalDisplays = [],
  playlists = [],
  layouts = [],
  groups = [],
  canEdit = false,
  onEnsureVirtual,
  onSaveDisplay,
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [display, setDisplay] = useState(virtualDisplay);
  const [previewTargetId, setPreviewTargetId] = useState(VIRTUAL_PLAYER_DISPLAY_ID);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    setDisplay(virtualDisplay);
  }, [virtualDisplay]);

  useEffect(() => {
    if (display || !onEnsureVirtual) return;
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const record = await onEnsureVirtual();
        if (active) setDisplay(record);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to initialize virtual player.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [display, onEnsureVirtual]);

  const previewOptions = useMemo(() => {
    const options = [];
    if (display) {
      options.push({
        id: display.id,
        label: `${display.name || "Virtual Player"} (default preview)`,
      });
    }
    for (const item of physicalDisplays) {
      if (isVirtualDisplay(item)) continue;
      options.push({
        id: item.id,
        label: `${item.name || item.id}${item.location ? ` · ${item.location}` : ""}`,
      });
    }
    return options;
  }, [display, physicalDisplays]);

  const previewDisplay = useMemo(() => {
    if (previewTargetId === display?.id) return display;
    return physicalDisplays.find((item) => item.id === previewTargetId) || display;
  }, [display, physicalDisplays, previewTargetId]);

  const playerUrl = previewDisplay ? buildVirtualPlayerUrl(previewDisplay) : "";
  const editingVirtual = previewTargetId === VIRTUAL_PLAYER_DISPLAY_ID;

  async function handleSaveConfiguration(event) {
    event.preventDefault();
    if (!canEdit || !onSaveDisplay || !display || !editingVirtual) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    setSaving(true);
    setError(null);

    try {
      const next = {
        ...display,
        playlistId: String(formData.get("playlistId") ?? ""),
        layoutId: String(formData.get("layoutId") ?? ""),
        groupId: String(formData.get("groupId") ?? ""),
        orientation: String(formData.get("orientation") ?? "landscape"),
        displayType: String(formData.get("displayType") ?? "information"),
        resolution: String(formData.get("resolution") ?? "1920×1080"),
        isVirtual: true,
      };
      await onSaveDisplay(next);
      setDisplay(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save virtual player settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !display) {
    return <p className="text-sm text-[var(--color-afta-muted)]">Preparing virtual player…</p>;
  }

  return (
    <section className="space-y-5">
      <div className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-afta-text)]">
              <MonitorPlay className="h-4 w-4 text-[var(--color-afta-red)]" />
              Virtual Player
            </p>
            <p className="mt-1 max-w-3xl text-sm text-[var(--color-afta-muted)]">
              Preview signage content in the browser without affecting physical device heartbeats or analytics.
              Creators can turn this feature on or off under System Settings → Digital Dashboard.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="app-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs"
              onClick={() => setIframeKey((value) => value + 1)}
              disabled={!playerUrl}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reload preview
            </button>
            {playerUrl ? (
              <a
                href={playerUrl}
                target="_blank"
                rel="noreferrer"
                className="app-btn-primary inline-flex items-center gap-1.5 px-3 py-2 text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open player
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {error ? <p className="app-error">{error}</p> : null}

      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <aside className="app-panel space-y-4 p-5">
          <div>
            <label className="app-label" htmlFor="virtual-preview-target">
              Preview display
            </label>
            <select
              id="virtual-preview-target"
              value={previewTargetId}
              onChange={(event) => setPreviewTargetId(event.target.value)}
              className="app-input"
            >
              {previewOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-[var(--color-afta-muted)]">
              Choose the virtual player or simulate any registered campus display.
            </p>
          </div>

          {editingVirtual && display && canEdit ? (
            <form className="space-y-3 border-t border-[var(--color-afta-border)] pt-4" onSubmit={handleSaveConfiguration}>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-afta-muted)]">
                Virtual player content
              </p>
              <label className="block">
                <span className="app-label">Playlist</span>
                <select name="playlistId" defaultValue={display.playlistId || ""} className="app-input">
                  <option value="">No playlist</option>
                  {playlists.map((playlist) => (
                    <option key={playlist.id} value={playlist.id}>
                      {playlist.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="app-label">Layout template</span>
                <select name="layoutId" defaultValue={display.layoutId || ""} className="app-input">
                  <option value="">Playlist only</option>
                  {layouts.map((layout) => (
                    <option key={layout.id} value={layout.id}>
                      {layout.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="app-label">Display group</span>
                <select name="groupId" defaultValue={display.groupId || ""} className="app-input">
                  <option value="">No group</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="app-label">Orientation</span>
                <select name="orientation" defaultValue={display.orientation || "landscape"} className="app-input">
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
                </select>
              </label>
              <label className="block">
                <span className="app-label">Display type</span>
                <select name="displayType" defaultValue={display.displayType || "information"} className="app-input">
                  {["information", "training_status", "classroom", "testing", "certification", "emergency", "analytics"].map(
                    (value) => (
                      <option key={value} value={value}>
                        {displayTypeLabel(value)}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label className="block">
                <span className="app-label">Resolution</span>
                <input name="resolution" defaultValue={display.resolution || "1920×1080"} className="app-input" />
              </label>
              <button type="submit" disabled={saving} className="app-btn-primary w-full px-4 py-2 text-xs disabled:opacity-60">
                {saving ? "Saving…" : "Save virtual player"}
              </button>
            </form>
          ) : (
            <div className="rounded-[10px] border border-[var(--color-afta-border)] bg-slate-50 px-4 py-3 text-xs text-[var(--color-afta-muted)]">
              {previewDisplay?.name ? (
                <>
                  Simulating <strong className="text-[var(--color-afta-text)]">{previewDisplay.name}</strong>. Edit the
                  source display under Network → Displays to change its assigned content.
                </>
              ) : (
                "Select a display to preview."
              )}
            </div>
          )}

          {playerUrl ? (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-afta-muted)]">
                Virtual player URL
              </p>
              <PlayerUrlField url={playerUrl} compact />
            </div>
          ) : null}
        </aside>

        <div className="app-panel overflow-hidden">
          <header className="border-b border-[var(--color-afta-border)] px-5 py-3">
            <p className="text-sm font-semibold text-[var(--color-afta-text)]">
              {previewDisplay?.name || "Virtual preview"}
            </p>
            <p className="text-xs text-[var(--color-afta-muted)]">
              Virtual sessions do not update device heartbeats or content view counts.
            </p>
          </header>
          <div
            className={`mx-auto overflow-hidden bg-black ${
              previewDisplay?.orientation === "portrait" ? "aspect-[9/16] max-h-[720px]" : "aspect-video"
            }`}
          >
            {playerUrl ? (
              <iframe
                key={`${previewTargetId}-${iframeKey}`}
                title={`Virtual player ${previewDisplay?.name || ""}`}
                src={playerUrl}
                className="h-full w-full border-0"
                allow="autoplay; fullscreen"
              />
            ) : (
              <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-white/60">
                Save the virtual player to start previewing content.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
