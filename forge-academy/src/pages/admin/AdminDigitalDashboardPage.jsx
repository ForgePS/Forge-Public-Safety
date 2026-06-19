import { useCallback, useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader.jsx";
import ForgeEcosystemOverview from "../../components/ForgeEcosystemOverview.jsx";
import DigitalDashboardPanel from "../../components/digitalDashboard/DigitalDashboardPanel.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  addDiningMenuToPlaylist,
  ensureDiningMenuMedia,
  ensureVirtualPlayerDisplay,
  deleteDigitalDashboardRecord,
  loadDigitalDashboardBundle,
  saveDigitalDashboardAlert,
  saveDigitalDashboardDiningMenu,
  saveDigitalDashboardDisplay,
  saveDigitalDashboardGroup,
  saveDigitalDashboardLayout,
  saveDigitalDashboardMedia,
  saveDigitalDashboardMediaBatch,
  saveDigitalDashboardMediaFolder,
  saveDigitalDashboardPlaylist,
  saveDigitalDashboardRssFeed,
  saveDigitalDashboardSchedule,
  syncDigitalDashboardRssFeed,
  updateDigitalDashboardMediaApproval,
  seedAcademyDigitalDashboard,
  remoteRefreshDisplay,
  remoteRestartDisplay,
  remoteAssignDisplayPlaylist,
  remoteUpdateDisplaySoftware,
} from "../../lib/digitalDashboardStore.js";
import {
  canAccessDigitalDashboard,
  canEditAnyDigitalDashboardSection,
} from "../../lib/digitalDashboardPermissions.js";
import { defaultAlertForm, VIRTUAL_PLAYER_DISPLAY_ID } from "../../lib/digitalDashboard.js";

export default function AdminDigitalDashboardPage() {
  const { user } = useAuth();
  const [media, setMedia] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [displays, setDisplays] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [groups, setGroups] = useState([]);
  const [layouts, setLayouts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [diningMenus, setDiningMenus] = useState([]);
  const [mediaFolders, setMediaFolders] = useState([]);
  const [rssFeeds, setRssFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const canSeed = canEditAnyDigitalDashboardSection(user);
  const hasAccess = canAccessDigitalDashboard(user);

  const reload = useCallback(async () => {
    const bundle = await loadDigitalDashboardBundle();
    setMedia(bundle.media);
    setPlaylists(bundle.playlists);
    setDisplays(bundle.displays);
    setSchedules(bundle.schedules);
    setGroups(bundle.groups);
    setLayouts(bundle.layouts);
    setAlerts(bundle.alerts);
    setDiningMenus(bundle.diningMenus);
    setMediaFolders(bundle.mediaFolders);
    setRssFeeds(bundle.rssFeeds);
  }, []);

  useEffect(() => {
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load digital dashboard data."))
      .finally(() => setLoading(false));
  }, [reload]);

  async function runAction(action, successMessage) {
    setError(null);
    setSuccess(null);
    try {
      await action();
      await reload();
      if (successMessage) setSuccess(successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save digital dashboard changes.");
      throw err;
    }
  }

  async function handleSaveMedia(record) {
    await runAction(() => saveDigitalDashboardMedia(record), "Media saved.");
  }

  async function handleSaveMediaBatch(records) {
    await runAction(() => saveDigitalDashboardMediaBatch(records), `${records.length} media items saved.`);
  }

  async function handleUpdateMediaApproval(mediaId, status, meta = {}) {
    await runAction(
      () => updateDigitalDashboardMediaApproval(mediaId, status, { ...meta, userId: user?.uid || user?.id }),
      status === "approved" ? "Media approved." : "Media approval updated.",
    );
  }

  async function handleSaveMediaFolder(record) {
    await runAction(() => saveDigitalDashboardMediaFolder(record), "Folder saved.");
  }

  async function handleDeleteMediaFolder(id) {
    await runAction(() => deleteDigitalDashboardRecord("digitalDashboardMediaFolders", id), "Folder deleted.");
  }

  async function handleSaveRssFeed(record) {
    await runAction(() => saveDigitalDashboardRssFeed(record), "RSS feed saved.");
  }

  async function handleDeleteRssFeed(id) {
    await runAction(() => deleteDigitalDashboardRecord("digitalDashboardRssFeeds", id), "RSS feed deleted.");
  }

  async function handleSyncRssFeed(feedId) {
    const result = await syncDigitalDashboardRssFeed(feedId);
    await reload();
    return result;
  }

  async function handleSavePlaylist(record) {
    await runAction(() => saveDigitalDashboardPlaylist(record), "Playlist saved.");
  }

  async function handleEnsureDiningMenuMedia(menu) {
    const mediaId = await ensureDiningMenuMedia(menu);
    await reload();
    return mediaId;
  }

  async function handleAddDiningMenuToPlaylist(menu, playlistId) {
    await runAction(() => addDiningMenuToPlaylist(menu, playlistId), "Menu added to playlist.");
  }

  async function handleSaveDisplay(record) {
    await runAction(() => saveDigitalDashboardDisplay(record), "Display saved.");
  }

  async function handleSaveSchedule(record) {
    await runAction(() => saveDigitalDashboardSchedule(record), "Schedule saved.");
  }

  async function handleSaveGroup(record) {
    await runAction(() => saveDigitalDashboardGroup(record), "Display group saved.");
  }

  async function handleSaveLayout(record) {
    await runAction(() => saveDigitalDashboardLayout(record), "Layout saved.");
  }

  async function handleSaveAlert(record) {
    await runAction(() => saveDigitalDashboardAlert(record), "Alert saved.");
  }

  async function handleSaveDiningMenu(record) {
    await runAction(() => saveDigitalDashboardDiningMenu(record), "Dining menu saved.");
  }

  async function handleDeleteMedia(id) {
    const item = media.find((row) => row.id === id);
    await runAction(
      () => deleteDigitalDashboardRecord("digitalDashboardMedia", id, { storagePath: item?.storagePath }),
      "Media deleted.",
    );
  }

  async function handleDeletePlaylist(id) {
    await runAction(() => deleteDigitalDashboardRecord("digitalDashboardPlaylists", id), "Playlist deleted.");
  }

  async function handleDeleteDisplay(id) {
    if (id === VIRTUAL_PLAYER_DISPLAY_ID) {
      setError("The virtual player cannot be deleted. Turn it off under System Settings → Digital Dashboard instead.");
      return;
    }
    await runAction(() => deleteDigitalDashboardRecord("digitalDashboardDisplays", id), "Display deleted.");
  }

  async function handleEnsureVirtualPlayer() {
    const record = await ensureVirtualPlayerDisplay();
    await reload();
    return record;
  }

  async function handleDeleteSchedule(id) {
    await runAction(() => deleteDigitalDashboardRecord("digitalDashboardSchedules", id), "Schedule deleted.");
  }

  async function handleDeleteGroup(id) {
    await runAction(() => deleteDigitalDashboardRecord("digitalDashboardGroups", id), "Display group deleted.");
  }

  async function handleDeleteLayout(id) {
    await runAction(() => deleteDigitalDashboardRecord("digitalDashboardLayouts", id), "Layout deleted.");
  }

  async function handleDeleteAlert(id) {
    await runAction(() => deleteDigitalDashboardRecord("digitalDashboardAlerts", id), "Alert deleted.");
  }

  async function handleDeleteDiningMenu(id) {
    await runAction(() => deleteDigitalDashboardRecord("digitalDashboardDiningMenus", id), "Dining menu deleted.");
  }

  async function handleRemoteRefresh(displayId) {
    await runAction(() => remoteRefreshDisplay(displayId), "Refresh command queued.");
  }

  async function handleRemoteRestart(displayId) {
    await runAction(() => remoteRestartDisplay(displayId), "Restart command queued.");
  }

  async function handleRemoteAssignPlaylist(displayId, playlistId) {
    await runAction(() => remoteAssignDisplayPlaylist(displayId, playlistId), "Playlist assigned and refresh queued.");
  }

  async function handleRemoteUpdateSoftware(displayId, softwareVersion) {
    await runAction(() => remoteUpdateDisplaySoftware(displayId, softwareVersion), "Software update command queued.");
  }

  async function handleQuickEmergencyAlert(displayId) {
    const display = displays.find((item) => item.id === displayId);
    if (!display) return;
    if (!window.confirm(`Activate emergency override for ${display.name}?`)) return;
    await runAction(
      () =>
        saveDigitalDashboardAlert({
          ...defaultAlertForm(),
          title: "Academy Emergency Notice",
          message: "Follow academy staff instructions. Check your assigned muster point or class location.",
          mode: "fullscreen",
          priority: 99,
          active: true,
          displayIds: [displayId],
          groupIds: display.groupId ? [display.groupId] : [],
        }),
      "Emergency alert activated for display.",
    );
  }

  async function handleSeedDefaults() {
    if (
      !window.confirm(
        "Load Sprint 14 sample data? This includes displays, groups, layouts, dining menus, widgets, playlists, schedules, and alerts.",
      )
    ) {
      return;
    }
    setSeeding(true);
    setError(null);
    setSuccess(null);
    try {
      const counts = await seedAcademyDigitalDashboard();
      await reload();
      setSuccess(
        `Sample data loaded: ${counts.displays} displays, ${counts.groups} groups, ${counts.layouts} layouts, ${counts.diningMenus} dining menu, ${counts.media} media items.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to seed digital dashboard defaults.");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Forge Displays"
        subtitle="Campus digital signage for AFTA training-site TVs — separate from ForgePS/Dashboard (RMS-fed org displays)"
        actions={
          canSeed ? (
            <button
              type="button"
              disabled={seeding || loading}
              className="app-btn-secondary px-4 py-2 text-xs disabled:opacity-60"
              onClick={handleSeedDefaults}
            >
              {seeding ? "Loading samples…" : "Load Sprint 14 sample data"}
            </button>
          ) : null
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        <ForgeEcosystemOverview variant="compact" showCampusNote />

        <div className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] px-5 py-4 shadow-sm">
          <p className="text-sm font-semibold text-[var(--color-afta-text)]">Quick start · Amazon Signage Stick</p>
          <p className="mt-1 text-sm text-[var(--color-afta-muted)]">
            Register a display, copy the player URL, and set it as the stick&apos;s home page. No separate player app or MVIX license required — Forge Displays runs in the browser.
          </p>
          <ol className="mt-3 grid gap-2 text-sm text-[var(--color-afta-text)] sm:grid-cols-2 lg:grid-cols-4">
            <li className="rounded-[10px] border border-[var(--color-afta-border)] bg-slate-50 px-3 py-2">1. Add a display under <strong>Network → Displays</strong></li>
            <li className="rounded-[10px] border border-[var(--color-afta-border)] bg-slate-50 px-3 py-2">2. Assign playlist, layout, or schedule</li>
            <li className="rounded-[10px] border border-[var(--color-afta-border)] bg-slate-50 px-3 py-2">3. Copy player URL or scan QR code</li>
            <li className="rounded-[10px] border border-[var(--color-afta-border)] bg-slate-50 px-3 py-2">4. Open URL on Signage Stick in kiosk mode</li>
          </ol>
        </div>

        {error ? <p className="app-error">{error}</p> : null}
        {success ? (
          <p className="rounded-[10px] border border-green-500/30 bg-green-50 px-4 py-3 text-sm text-green-800">
            {success}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--color-afta-muted)]">Loading digital dashboard…</p>
        ) : !hasAccess ? (
          <p className="rounded-[10px] border border-amber-500/30 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            You do not have permission to view any Digital Dashboard sections. Ask a system administrator to assign section access on your user profile.
          </p>
        ) : (
          <DigitalDashboardPanel
            user={user}
            media={media}
            playlists={playlists}
            displays={displays}
            schedules={schedules}
            groups={groups}
            layouts={layouts}
            alerts={alerts}
            diningMenus={diningMenus}
            mediaFolders={mediaFolders}
            rssFeeds={rssFeeds}
            onSaveMedia={handleSaveMedia}
            onSaveMediaBatch={handleSaveMediaBatch}
            onUpdateMediaApproval={handleUpdateMediaApproval}
            onSaveMediaFolder={handleSaveMediaFolder}
            onDeleteMediaFolder={handleDeleteMediaFolder}
            onSaveRssFeed={handleSaveRssFeed}
            onDeleteRssFeed={handleDeleteRssFeed}
            onSyncRssFeed={handleSyncRssFeed}
            onSavePlaylist={handleSavePlaylist}
            onSaveDisplay={handleSaveDisplay}
            onSaveSchedule={handleSaveSchedule}
            onSaveGroup={handleSaveGroup}
            onSaveLayout={handleSaveLayout}
            onSaveAlert={handleSaveAlert}
            onSaveDiningMenu={handleSaveDiningMenu}
            onDeleteMedia={handleDeleteMedia}
            onDeletePlaylist={handleDeletePlaylist}
            onDeleteDisplay={handleDeleteDisplay}
            onDeleteSchedule={handleDeleteSchedule}
            onDeleteGroup={handleDeleteGroup}
            onDeleteLayout={handleDeleteLayout}
            onDeleteAlert={handleDeleteAlert}
            onDeleteDiningMenu={handleDeleteDiningMenu}
            onRemoteRefresh={handleRemoteRefresh}
            onRemoteRestart={handleRemoteRestart}
            onRemoteAssignPlaylist={handleRemoteAssignPlaylist}
            onRemoteUpdateSoftware={handleRemoteUpdateSoftware}
            onQuickEmergencyAlert={handleQuickEmergencyAlert}
            onEnsureVirtualPlayer={handleEnsureVirtualPlayer}
            onEnsureDiningMenuMedia={handleEnsureDiningMenuMedia}
            onAddDiningMenuToPlaylist={handleAddDiningMenuToPlaylist}
            onSeedDefaults={canSeed ? handleSeedDefaults : undefined}
          />
        )}
      </div>
    </>
  );
}
