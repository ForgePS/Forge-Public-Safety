import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  CirclePlus,
  Film,
  LayoutGrid,
  LayoutTemplate,
  MonitorPlay,
  MonitorSmartphone,
  Pencil,
  Play,
  Search,
  Siren,
  Trash2,
  Tv,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { StatCard } from "../PageHeader.jsx";
import { useSystemSettingsOptional } from "../../context/SystemSettingsContext.jsx";
import { isMediaApprovalRequired, isVirtualPlayerEnabled } from "../../lib/systemSettings.js";
import {
  DASHBOARD_VIEW_GROUPS,
  DigitalDashboardNav,
  FORGE_DISPLAYS_PRIMARY_NAV,
  ForgeDisplaysPrimaryNav,
  PlayerUrlField,
} from "./DigitalDashboardShared.jsx";
import DigitalDashboardMediaModal from "./DigitalDashboardMediaModal.jsx";
import DigitalDashboardMediaLibrary from "./DigitalDashboardMediaLibrary.jsx";
import DeviceLibrarySection from "./DeviceLibrarySection.jsx";
import VirtualPlayerSection from "./VirtualPlayerSection.jsx";
import DigitalDashboardLibraryShell, { LibraryFilterPill, LibraryGroupTag, LibraryStatusBadge } from "./DigitalDashboardLibraryShell.jsx";
import {
  DigitalDashboardAlertsSection,
  DigitalDashboardAnalyticsSection,
  DigitalDashboardDiningSection,
  DigitalDashboardGroupsSection,
  DigitalDashboardLayoutsSection,
  DigitalDashboardPlatformSection,
  DigitalDashboardWidgetsSection,
} from "./DigitalDashboardSprintSections.jsx";
import {
  buildDisplayPlayerUrl,
  buildVirtualPlayerUrl,
  buildMediaLookup,
  buildPlaylistLookup,
  computePlaylistDuration,
  createDigitalDashboardId,
  createWidgetMedia,
  DAY_LABELS,
  defaultDisplayForm,
  defaultMediaForm,
  defaultPlaylistForm,
  defaultScheduleForm,
  describePlaylistMediaItem,
  displayGroupLabel,
  displayStatusTone,
  displayTypeLabel,
  DISPLAY_STATUSES,
  DISPLAY_TYPES,
  enrichDisplaysWithHeartbeat,
  filterLibraryRecords,
  filterPhysicalDisplays,
  formatDisplayStatus,
  formatDurationSeconds,
  formatLastSync,
  generatePublicKey,
  isVirtualDisplay,
  MEDIA_ADD_PATHS,
  MEDIA_APPROVAL_STATUSES,
  MEDIA_TYPES,
  mediaAddPathForType,
  PLAYLIST_QUICK_WIDGETS,
  resolveDisplayPlaylist,
  summarizeExtendedStats,
  TRANSITION_TYPES,
  WIDGET_TYPES,
} from "../../lib/digitalDashboard.js";
import {
  canEditAnyDigitalDashboardSection,
  canEditDigitalDashboardSection,
  canViewDigitalDashboardSection,
} from "../../lib/digitalDashboardPermissions.js";

const VIEWS = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "displays", label: "Displays", icon: Tv },
  { id: "devices", label: "Devices", icon: MonitorSmartphone },
  { id: "virtualPlayer", label: "Virtual Player", icon: MonitorPlay },
  { id: "groups", label: "Groups", icon: MonitorPlay },
  { id: "media", label: "Media", icon: Film },
  { id: "playlists", label: "Playlists", icon: MonitorPlay },
  { id: "layouts", label: "Layouts", icon: LayoutTemplate },
  { id: "widgets", label: "Widgets", icon: LayoutGrid },
  { id: "schedules", label: "Schedules", icon: CalendarClock },
  { id: "dining", label: "Dining", icon: UtensilsCrossed },
  { id: "alerts", label: "Alerts", icon: Siren },
  { id: "analytics", label: "Analytics", icon: LayoutGrid },
  { id: "platform", label: "Platform", icon: LayoutTemplate },
];

const KPI_CARDS = [
  { key: "displayCount", label: "Campus displays", metaKey: "onlineCount", metaSuffix: " online", icon: Tv },
  { key: "groupCount", label: "Display groups", meta: "Lobby, classroom, dining, housing", icon: MonitorPlay },
  { key: "layoutCount", label: "Screen layouts", meta: "Multi-zone templates", icon: LayoutTemplate },
  { key: "activeAlertCount", label: "Active alerts", meta: "Emergency override ready", icon: Siren },
];

const STATUS_CLASS = {
  success: "border-green-200 bg-green-50 text-green-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  critical: "border-slate-200 bg-slate-100 text-slate-600",
};

function StatusPill({ status }) {
  const tone = displayStatusTone(status);
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_CLASS[tone]}`}>
      {formatDisplayStatus(status)}
    </span>
  );
}

function TabToolbar({ query, onQueryChange, placeholder, addLabel, onAdd, canEdit }) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--color-afta-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <label className="relative block min-w-0 flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-afta-subtle)]" />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={placeholder}
          className="app-input pl-9"
        />
      </label>
      {canEdit ? (
        <button type="button" className="app-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs" onClick={onAdd}>
          <CirclePlus className="h-4 w-4" />
          {addLabel}
        </button>
      ) : null}
    </div>
  );
}

function PreviewOverlay({ display, onClose, useVirtualSession = false }) {
  const playerUrl =
    display?.id && display?.publicKey
      ? useVirtualSession
        ? buildVirtualPlayerUrl(display)
        : buildDisplayPlayerUrl(display.id, display.publicKey)
      : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="app-panel w-full max-w-5xl overflow-hidden" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between border-b border-[var(--color-afta-border)] px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-afta-text)]">{display?.name || "Live preview"}</h3>
            <p className="mt-0.5 text-xs text-[var(--color-afta-muted)]">
              {playerUrl
                ? useVirtualSession
                  ? "Virtual player preview — does not affect device heartbeats"
                  : "Live player — same view as Amazon Signage Stick"
                : "Save the display to preview the player."}
            </p>
          </div>
          <button type="button" className="app-btn-secondary p-2" onClick={onClose} aria-label="Close preview">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div
          className={`mx-auto overflow-hidden bg-black ${
            display?.orientation === "portrait" ? "aspect-[9/16] max-h-[560px]" : "aspect-video"
          }`}
        >
          {playerUrl ? (
            <iframe title={`Preview ${display.name}`} src={playerUrl} className="h-full w-full border-0" allow="autoplay; fullscreen" />
          ) : (
            <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-white/60">Save display to enable preview</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModalShell({ title, wide, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className={`app-panel max-h-[90vh] w-full overflow-y-auto ${wide ? "max-w-2xl" : "max-w-lg"}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="border-b border-[var(--color-afta-border)] px-5 py-4">
          <h3 className="text-sm font-semibold text-[var(--color-afta-text)]">{title}</h3>
        </header>
        <div className="space-y-4 px-5 py-4">{children}</div>
        <footer className="flex justify-end gap-2 border-t border-[var(--color-afta-border)] px-5 py-4">{footer}</footer>
      </div>
    </div>
  );
}

export default function DigitalDashboardPanel({
  media = [],
  playlists = [],
  displays = [],
  schedules = [],
  groups = [],
  layouts = [],
  alerts = [],
  diningMenus = [],
  mediaFolders = [],
  rssFeeds = [],
  onSaveMedia,
  onSaveMediaBatch,
  onUpdateMediaApproval,
  onSaveMediaFolder,
  onDeleteMediaFolder,
  onSaveRssFeed,
  onDeleteRssFeed,
  onSyncRssFeed,
  onSavePlaylist,
  onSaveDisplay,
  onSaveSchedule,
  onSaveGroup,
  onSaveLayout,
  onSaveAlert,
  onSaveDiningMenu,
  onDeleteMedia,
  onDeletePlaylist,
  onDeleteDisplay,
  onDeleteSchedule,
  onDeleteGroup,
  onDeleteLayout,
  onDeleteAlert,
  onDeleteDiningMenu,
  onRemoteRefresh,
  onRemoteRestart,
  onRemoteAssignPlaylist,
  onRemoteUpdateSoftware,
  onQuickEmergencyAlert,
  onSeedDefaults,
  onEnsureVirtualPlayer,
  onEnsureDiningMenuMedia,
  onAddDiningMenuToPlaylist,
  user = null,
}) {
  const settingsContext = useSystemSettingsOptional();
  const virtualPlayerEnabled = isVirtualPlayerEnabled(settingsContext?.settings);
  const mediaApprovalRequired = isMediaApprovalRequired(settingsContext?.settings);
  const [view, setView] = useState("overview");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const [previewDisplay, setPreviewDisplay] = useState(null);
  const [saving, setSaving] = useState(false);
  const [quickAdding, setQuickAdding] = useState("");
  const [playlistMediaFilter, setPlaylistMediaFilter] = useState("all");

  function sectionCanEdit(sectionId) {
    return canEditDigitalDashboardSection(user, sectionId);
  }

  const displaysCanEdit = sectionCanEdit("displays");
  const canSeedData = Boolean(onSeedDefaults) && canEditAnyDigitalDashboardSection(user);

  const primaryNavItems = useMemo(
    () =>
      FORGE_DISPLAYS_PRIMARY_NAV.filter((item) => {
        if (item.id === "virtualPlayer" && !virtualPlayerEnabled) return false;
        return canViewDigitalDashboardSection(user, item.id);
      }),
    [user, virtualPlayerEnabled],
  );

  const groupedNav = useMemo(() => {
    const visibleIds = new Set(
      VIEWS.filter((item) => {
        if (item.id === "virtualPlayer" && !virtualPlayerEnabled) return false;
        return canViewDigitalDashboardSection(user, item.id);
      }).map((item) => item.id),
    );
    /** @type {{ label: string, views: { id: string, label: string, icon: typeof LayoutGrid }[] }[]} */
    const groups = [];
    for (const row of DASHBOARD_VIEW_GROUPS) {
      if (!visibleIds.has(row.id)) continue;
      const viewDef = VIEWS.find((item) => item.id === row.id);
      let group = groups.find((item) => item.label === row.group);
      if (!group) {
        group = { label: row.group, views: [] };
        groups.push(group);
      }
      group.views.push({ id: row.id, label: row.label, icon: viewDef?.icon || LayoutGrid });
    }
    return groups;
  }, [user, virtualPlayerEnabled]);

  useEffect(() => {
    const flatViews = groupedNav.flatMap((group) => group.views);
    if (!flatViews.length) return;
    if (!flatViews.some((item) => item.id === view)) {
      setView(flatViews[0].id);
    }
  }, [groupedNav, view]);

  const mediaById = useMemo(() => buildMediaLookup(media), [media]);
  const menusById = useMemo(
    () => Object.fromEntries(diningMenus.map((menu) => [menu.id, menu])),
    [diningMenus],
  );
  const playlistsById = useMemo(() => buildPlaylistLookup(playlists), [playlists]);
  const physicalDisplays = useMemo(() => filterPhysicalDisplays(displays), [displays]);
  const virtualDisplay = useMemo(() => displays.find((item) => isVirtualDisplay(item)) ?? null, [displays]);
  const heartbeatDisplays = useMemo(() => enrichDisplaysWithHeartbeat(physicalDisplays), [physicalDisplays]);
  const stats = useMemo(
    () => summarizeExtendedStats(physicalDisplays, media, playlists, schedules, groups, layouts, alerts, diningMenus),
    [physicalDisplays, media, playlists, schedules, groups, layouts, alerts, diningMenus],
  );
  const groupsById = useMemo(() => Object.fromEntries(groups.map((item) => [item.id, item])), [groups]);
  const layoutsById = useMemo(() => Object.fromEntries(layouts.map((item) => [item.id, item])), [layouts]);

  const campuses = useMemo(
    () => [...new Set(physicalDisplays.map((item) => item.station).filter(Boolean))],
    [physicalDisplays],
  );

  const filteredDisplays = useMemo(
    () => filterLibraryRecords(heartbeatDisplays, query, ["name", "location", "station", "notes", "displayType"]),
    [heartbeatDisplays, query],
  );
  const filteredPlaylists = useMemo(
    () => filterLibraryRecords(playlists, query, ["name", "description"]),
    [playlists, query],
  );
  const filteredSchedules = useMemo(
    () => filterLibraryRecords(schedules, query, ["name"]),
    [schedules, query],
  );

  function closeModal() {
    setModal(null);
  }

  async function submitSave(handler, record, sectionId = view) {
    if (!sectionCanEdit(sectionId) || !handler) return;
    setSaving(true);
    try {
      await handler(record);
      closeModal();
    } finally {
      setSaving(false);
    }
  }

  function saveDisplay(form) {
    const record = {
      ...form,
      id: form.id || createDigitalDashboardId("DDX"),
      publicKey: form.publicKey || generatePublicKey(),
      lastSyncAt: form.lastSyncAt || new Date().toISOString(),
    };
    return submitSave(onSaveDisplay, record, "displays");
  }

  function saveMediaItem(form) {
    const record = {
      ...form,
      id: form.id || createDigitalDashboardId("DDM"),
      durationSec: Number(form.durationSec) || 10,
      priority: Number(form.priority) || 1,
      fileSize: Number(form.fileSize) || 0,
      active: form.active !== false,
      approvalStatus:
        form.id && form.approvalStatus
          ? form.approvalStatus
          : mediaApprovalRequired
            ? MEDIA_APPROVAL_STATUSES.PENDING
            : MEDIA_APPROVAL_STATUSES.APPROVED,
      tags: Array.isArray(form.tags)
        ? form.tags
        : String(form.tags || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
      createdAt: form.createdAt || new Date().toISOString(),
    };
    return submitSave(onSaveMedia, record, "media");
  }

  function saveMediaBatch(records) {
    return submitSave(onSaveMediaBatch, records, "media");
  }

  function openMediaModal(formOverrides = {}, initialPath = MEDIA_ADD_PATHS.GENERAL_FILE) {
    setModal({
      type: "media",
      form: defaultMediaForm(formOverrides),
      initialPath,
    });
  }

  function savePlaylist(form) {
    return submitSave(onSavePlaylist, {
      ...form,
      id: form.id || createDigitalDashboardId("DDP"),
      itemIds: Array.isArray(form.itemIds) ? form.itemIds : [],
    }, "playlists");
  }

  function saveSchedule(form) {
    return submitSave(onSaveSchedule, {
      ...form,
      id: form.id || createDigitalDashboardId("DDS"),
      displayIds: Array.isArray(form.displayIds) ? form.displayIds : [],
      daysOfWeek: Array.isArray(form.daysOfWeek) ? form.daysOfWeek : [],
      priority: Number(form.priority) || 1,
      active: form.active !== false,
    }, "schedules");
  }

  async function handleDelete(handler, id, label, sectionId = view) {
    if (!sectionCanEdit(sectionId) || !handler) return;
    if (!window.confirm(`Delete this ${label}?`)) return;
    await handler(id);
    closeModal();
  }

  function patchForm(next) {
    setModal((current) => ({ ...current, form: { ...current.form, ...next } }));
  }

  function toggleInForm(field, value) {
    const set = new Set(modal.form[field] || []);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    const next = [...set];
    if (field === "daysOfWeek") next.sort((a, b) => a - b);
    patchForm({ [field]: next });
  }

  function movePlaylistItem(mediaId, direction) {
    const ids = [...(modal.form.itemIds || [])];
    const index = ids.indexOf(mediaId);
    if (index === -1) return;
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= ids.length) return;
    [ids[index], ids[nextIndex]] = [ids[nextIndex], ids[index]];
    patchForm({ itemIds: ids });
  }

  function removePlaylistItem(mediaId) {
    patchForm({ itemIds: (modal.form.itemIds || []).filter((id) => id !== mediaId) });
  }

  const filteredPlaylistMedia = useMemo(() => {
    if (playlistMediaFilter === "widgets") {
      return media.filter((item) => item.type === "widget");
    }
    if (playlistMediaFilter === "dining") {
      return media.filter((item) => item.widgetType === "dining" || item.category === "dining");
    }
    if (playlistMediaFilter === "media") {
      return media.filter((item) => item.type !== "widget");
    }
    return media;
  }, [media, playlistMediaFilter]);

  async function quickAddDiningMenu(menuId) {
    if (!onEnsureDiningMenuMedia || modal?.type !== "playlist") return;
    const menu = diningMenus.find((item) => item.id === menuId);
    if (!menu) return;
    setQuickAdding(menuId);
    try {
      const mediaId = await onEnsureDiningMenuMedia(menu);
      if (!(modal.form.itemIds || []).includes(mediaId)) {
        patchForm({ itemIds: [...(modal.form.itemIds || []), mediaId] });
      }
    } finally {
      setQuickAdding("");
    }
  }

  async function quickAddWidget(widgetType) {
    if (!onSaveMedia || modal?.type !== "playlist") return;
    setQuickAdding(widgetType);
    try {
      const record = {
        ...createWidgetMedia(widgetType),
        id: createDigitalDashboardId("DDM"),
        approvalStatus: mediaApprovalRequired
          ? MEDIA_APPROVAL_STATUSES.PENDING
          : MEDIA_APPROVAL_STATUSES.APPROVED,
        createdAt: new Date().toISOString(),
      };
      await onSaveMedia(record);
      if (!(modal.form.itemIds || []).includes(record.id)) {
        patchForm({ itemIds: [...(modal.form.itemIds || []), record.id] });
      }
    } finally {
      setQuickAdding("");
    }
  }

  const playerUrl =
    modal?.type === "display" && modal.form.id && modal.form.publicKey
      ? buildDisplayPlayerUrl(modal.form.id, modal.form.publicKey)
      : "";

  return (
    <div className="space-y-5">
      {primaryNavItems.length ? (
        <ForgeDisplaysPrimaryNav
          items={primaryNavItems}
          activeView={view}
          onViewChange={(id) => {
            setView(id);
            setQuery("");
          }}
        />
      ) : null}

      <DigitalDashboardNav
        groups={groupedNav}
        activeView={view}
        onViewChange={(id) => {
          setView(id);
          setQuery("");
        }}
      />

      {view === "overview" ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {KPI_CARDS.map(({ key, label, metaKey, metaSuffix, meta, icon: Icon }) => (
              <StatCard
                key={key}
                label={label}
                value={stats[key]}
                sub={metaKey ? `${stats[metaKey]}${metaSuffix || ""}` : meta}
                icon={Icon}
              />
            ))}
          </div>

          <section className="app-panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-afta-border)] px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-afta-text)]">Display network</h3>
                <p className="text-xs text-[var(--color-afta-muted)]">Wall screens across campus and training areas</p>
              </div>
              {displaysCanEdit ? (
                <button type="button" className="app-btn-primary inline-flex items-center gap-1.5 px-3 py-2 text-xs" onClick={() => setModal({ type: "display", form: defaultDisplayForm() })}>
                  <CirclePlus className="h-4 w-4" />
                  Add display
                </button>
              ) : null}
            </div>
            <div className="p-4">
              {physicalDisplays.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {heartbeatDisplays.map((display) => {
                    const playlist = resolveDisplayPlaylist(display, playlistsById);
                    const group = groupsById[display.groupId];
                    return (
                      <article key={display.id} className="rounded-[12px] border border-[var(--color-afta-border)] p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-semibold text-[var(--color-afta-text)]">{display.name}</h4>
                            <p className="text-xs text-[var(--color-afta-muted)]">
                              {display.location}
                              {display.station ? ` · ${display.station}` : ""}
                            </p>
                          </div>
                          <StatusPill status={display.status} />
                        </div>
                        <dl className="mt-3 space-y-1 text-xs">
                          <div className="flex justify-between gap-2"><dt className="text-[var(--color-afta-muted)]">Type</dt><dd>{displayTypeLabel(display.displayType)}</dd></div>
                          <div className="flex justify-between gap-2"><dt className="text-[var(--color-afta-muted)]">Group</dt><dd>{group?.name || displayGroupLabel(display.groupId)}</dd></div>
                          <div className="flex justify-between gap-2"><dt className="text-[var(--color-afta-muted)]">Playlist</dt><dd>{playlist?.name || "Unassigned"}</dd></div>
                          <div className="flex justify-between gap-2"><dt className="text-[var(--color-afta-muted)]">Heartbeat</dt><dd>{formatLastSync(display.heartbeatAt || display.lastSyncAt)}</dd></div>
                        </dl>
                        <div className="mt-3 flex gap-2">
                          <button type="button" className="app-btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-xs" onClick={() => setPreviewDisplay(display)}>
                            <Play className="h-3.5 w-3.5" />
                            Preview
                          </button>
                          {displaysCanEdit ? (
                            <button type="button" className="app-btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-xs" onClick={() => setModal({ type: "display", form: { ...display } })}>
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <p className="text-sm font-semibold text-[var(--color-afta-text)]">No campus displays registered</p>
                  <p className="mt-1 text-xs text-[var(--color-afta-muted)]">Add lobby screens or training-room projectors to publish academy content.</p>
                  {canSeedData ? (
                    <button type="button" className="app-btn-secondary mt-4 px-4 py-2 text-xs" onClick={onSeedDefaults}>Load sample campus data</button>
                  ) : null}
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {view === "displays" || view === "devices" ? (
        <DeviceLibrarySection
          displays={heartbeatDisplays}
          groups={groups}
          groupsById={groupsById}
          playlists={playlists}
          alerts={alerts}
          canEdit={view === "displays" ? displaysCanEdit : sectionCanEdit("devices")}
          showProvisioning={view === "devices"}
          showRemote={view === "devices"}
          onAdd={() => setModal({ type: "display", form: defaultDisplayForm() })}
          onEdit={(display) => setModal({ type: "display", form: { ...display } })}
          onPreview={setPreviewDisplay}
          onDelete={(id) => handleDelete(onDeleteDisplay, id, "display", "displays")}
          onRemoteRefresh={onRemoteRefresh}
          onRemoteRestart={onRemoteRestart}
          onRemoteAssignPlaylist={onRemoteAssignPlaylist}
          onRemoteUpdateSoftware={onRemoteUpdateSoftware}
          onQuickEmergencyAlert={onQuickEmergencyAlert}
        />
      ) : null}

      {view === "virtualPlayer" && virtualPlayerEnabled ? (
        <VirtualPlayerSection
          virtualDisplay={virtualDisplay}
          physicalDisplays={physicalDisplays}
          playlists={playlists}
          layouts={layouts}
          groups={groups}
          canEdit={sectionCanEdit("virtualPlayer")}
          onEnsureVirtual={onEnsureVirtualPlayer}
          onSaveDisplay={onSaveDisplay}
        />
      ) : null}

      {view === "media" ? (
        <DigitalDashboardMediaLibrary
          media={media}
          playlists={playlists}
          schedules={schedules}
          mediaFolders={mediaFolders}
          rssFeeds={rssFeeds}
          query={query}
          onQueryChange={setQuery}
          canEdit={sectionCanEdit("media")}
          settings={settingsContext?.settings}
          userId={user?.uid || user?.id || ""}
          onSaveMediaBatch={onSaveMediaBatch ? saveMediaBatch : undefined}
          onUpdateApproval={onUpdateMediaApproval}
          onDeleteMedia={onDeleteMedia}
          onSaveFolder={onSaveMediaFolder}
          onDeleteFolder={onDeleteMediaFolder}
          onSaveRssFeed={onSaveRssFeed}
          onDeleteRssFeed={onDeleteRssFeed}
          onSyncRssFeed={onSyncRssFeed}
          onAddMedia={openMediaModal}
          onEditMedia={(item) =>
            setModal({
              type: "media",
              form: { ...item, tags: item.tags || [] },
              initialPath: mediaAddPathForType(item.type),
            })
          }
        />
      ) : null}

      {view === "playlists" ? (
        <DigitalDashboardLibraryShell
          title="Playlist Library"
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder="Search playlists"
          totalItems={filteredPlaylists.length}
          filters={
            <LibraryFilterPill
              label={playlistMediaFilter === "all" ? "All content" : playlistMediaFilter}
              active={playlistMediaFilter !== "all"}
            />
          }
          actions={
            sectionCanEdit("playlists") ? (
              <button
                type="button"
                className="app-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs"
                onClick={() => {
                  setPlaylistMediaFilter("all");
                  setModal({ type: "playlist", form: defaultPlaylistForm() });
                }}
              >
                <CirclePlus className="h-4 w-4" />
                Add playlist
              </button>
            ) : null
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--color-afta-border)] bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Loop</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filteredPlaylists.length ? filteredPlaylists.map((playlist) => {
                  const active =
                    displays.some((display) => display.playlistId === playlist.id) ||
                    schedules.some((schedule) => schedule.playlistId === playlist.id && schedule.active !== false);
                  return (
                    <tr key={playlist.id} className="border-t border-[var(--color-afta-border)] hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-700">
                            <MonitorPlay className="h-4 w-4" />
                          </span>
                          <div>
                            <strong className="block text-sm">{playlist.name}</strong>
                            <span className="text-xs text-[var(--color-afta-muted)]">{playlist.description || "Playlist"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{(playlist.itemIds || []).length}</td>
                      <td className="px-4 py-3 text-sm">{formatDurationSeconds(computePlaylistDuration(playlist, mediaById))}</td>
                      <td className="px-4 py-3 text-sm">{playlist.loop !== false ? "Yes" : "No"}</td>
                      <td className="px-4 py-3"><LibraryStatusBadge active={active} /></td>
                      <td className="px-4 py-3">
                        <RowActions
                          canEdit={sectionCanEdit("playlists")}
                          onEdit={() => setModal({ type: "playlist", form: { ...playlist, itemIds: [...(playlist.itemIds || [])] } })}
                          onDelete={() => handleDelete(onDeletePlaylist, playlist.id, "playlist", "playlists")}
                        />
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-sm text-[var(--color-afta-muted)]">
                      Build playback sequences for lobby, classroom, and dining displays.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DigitalDashboardLibraryShell>
      ) : null}

      {view === "schedules" ? (
        <section className="app-panel overflow-hidden">
          <TabToolbar query={query} onQueryChange={setQuery} placeholder="Search schedules…" addLabel="Add schedule" onAdd={() => setModal({ type: "schedule", form: defaultScheduleForm() })} canEdit={sectionCanEdit("schedules")} />
          <ListTable
            rows={filteredSchedules}
            empty={schedules.length ? "No schedules match your search." : "Time-box playlists for weekday campus hours or training sessions."}
            columns={["Schedule", "Displays", "Playlist", "Window", "Status", ""]}
            renderRow={(schedule) => {
              const playlist = playlistsById[schedule.playlistId];
              const dayLabel = (schedule.daysOfWeek || []).map((day) => DAY_LABELS[day]).join(", ");
              return (
                <tr key={schedule.id} className="border-t border-[var(--color-afta-border)]">
                  <td className="px-4 py-3 text-sm font-semibold">{schedule.name}</td>
                  <td className="px-4 py-3 text-sm">{(schedule.displayIds || []).length || "All"}</td>
                  <td className="px-4 py-3 text-sm">{playlist?.name || "—"}</td>
                  <td className="px-4 py-3 text-xs"><div>{dayLabel || "Every day"}</div><div>{schedule.startTime} – {schedule.endTime}</div></td>
                  <td className="px-4 py-3"><StatusPill status={schedule.active !== false ? "online" : "offline"} /></td>
                  <td className="px-4 py-3"><RowActions canEdit={sectionCanEdit("schedules")} onEdit={() => setModal({ type: "schedule", form: { ...schedule, displayIds: [...(schedule.displayIds || [])], daysOfWeek: [...(schedule.daysOfWeek || [])] } })} onDelete={() => handleDelete(onDeleteSchedule, schedule.id, "schedule", "schedules")} /></td>
                </tr>
              );
            }}
          />
        </section>
      ) : null}

      {view === "groups" ? (
        <DigitalDashboardGroupsSection
          groups={groups}
          displays={displays}
          canEdit={sectionCanEdit("groups")}
          onSaveGroup={onSaveGroup}
          onDeleteGroup={onDeleteGroup}
        />
      ) : null}

      {view === "layouts" ? (
        <DigitalDashboardLayoutsSection
          layouts={layouts}
          canEdit={sectionCanEdit("layouts")}
          onSaveLayout={onSaveLayout}
          onDeleteLayout={onDeleteLayout}
        />
      ) : null}

      {view === "widgets" ? (
        <DigitalDashboardWidgetsSection media={media} canEdit={sectionCanEdit("widgets")} onSaveMedia={onSaveMedia} />
      ) : null}

      {view === "dining" ? (
        <DigitalDashboardDiningSection
          diningMenus={diningMenus}
          playlists={playlists}
          canEdit={sectionCanEdit("dining")}
          onSaveDiningMenu={onSaveDiningMenu}
          onDeleteDiningMenu={onDeleteDiningMenu}
          onAddDiningMenuToPlaylist={onAddDiningMenuToPlaylist}
        />
      ) : null}

      {view === "alerts" ? (
        <DigitalDashboardAlertsSection
          alerts={alerts}
          displays={displays}
          groups={groups}
          canEdit={sectionCanEdit("alerts")}
          onSaveAlert={onSaveAlert}
          onDeleteAlert={onDeleteAlert}
        />
      ) : null}

      {view === "analytics" ? (
        <DigitalDashboardAnalyticsSection
          displays={heartbeatDisplays}
          playlists={playlists}
          media={media}
          schedules={schedules}
        />
      ) : null}

      {view === "platform" ? <DigitalDashboardPlatformSection /> : null}

      {previewDisplay ? (
        <PreviewOverlay
          display={previewDisplay}
          onClose={() => setPreviewDisplay(null)}
          useVirtualSession={virtualPlayerEnabled}
        />
      ) : null}

      {modal?.type === "display" ? (
        <ModalShell
          title={modal.form.id ? "Edit display" : "Add display"}
          onClose={closeModal}
          footer={
            <>
              <button type="button" className="app-btn-secondary px-4 py-2 text-xs" onClick={closeModal}>Cancel</button>
              <button type="button" disabled={saving} className="app-btn-primary px-4 py-2 text-xs" onClick={() => saveDisplay(modal.form)}>Save display</button>
            </>
          }
        >
          <label className="block"><span className="app-label">Display name</span><input className="app-input" value={modal.form.name} onChange={(event) => patchForm({ name: event.target.value })} required /></label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block"><span className="app-label">Asset ID</span><input className="app-input" value={modal.form.assetId || ""} onChange={(event) => patchForm({ assetId: event.target.value })} placeholder="AFTA-TV-001" /></label>
            <label className="block"><span className="app-label">Device ID</span><input className="app-input" value={modal.form.deviceId || ""} onChange={(event) => patchForm({ deviceId: event.target.value })} placeholder="forge-player-lobby-01" /></label>
            <label className="block"><span className="app-label">MAC address</span><input className="app-input font-mono text-xs" value={modal.form.macAddress || ""} onChange={(event) => patchForm({ macAddress: event.target.value })} placeholder="00:1A:2B:3C:4D:01" /></label>
          </div>
          <label className="block"><span className="app-label">Location (building / room)</span><input className="app-input" value={modal.form.location} onChange={(event) => patchForm({ location: event.target.value })} /></label>
          <label className="block"><span className="app-label">Campus</span><input list="dd-campuses" className="app-input" value={modal.form.station} onChange={(event) => patchForm({ station: event.target.value })} placeholder="e.g. Camden Campus" /><datalist id="dd-campuses">{campuses.map((campus) => <option key={campus} value={campus} />)}</datalist></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="app-label">Display type</span><select className="app-input" value={modal.form.displayType || "information"} onChange={(event) => patchForm({ displayType: event.target.value })}>{DISPLAY_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="block"><span className="app-label">Display group</span><select className="app-input" value={modal.form.groupId || ""} onChange={(event) => patchForm({ groupId: event.target.value })}><option value="">Unassigned</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="app-label">Resolution</span><input className="app-input" value={modal.form.resolution} onChange={(event) => patchForm({ resolution: event.target.value })} /></label>
            <label className="block"><span className="app-label">Orientation</span><select className="app-input" value={modal.form.orientation} onChange={(event) => patchForm({ orientation: event.target.value })}><option value="landscape">Landscape</option><option value="portrait">Portrait</option></select></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="app-label">Status</span><select className="app-input" value={modal.form.status} onChange={(event) => patchForm({ status: event.target.value })}>{DISPLAY_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="block"><span className="app-label">Default playlist</span><select className="app-input" value={modal.form.playlistId} onChange={(event) => patchForm({ playlistId: event.target.value })}><option value="">Unassigned</option>{playlists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.name}</option>)}</select></label>
          </div>
          <label className="block"><span className="app-label">Screen layout</span><select className="app-input" value={modal.form.layoutId || ""} onChange={(event) => patchForm({ layoutId: event.target.value })}><option value="">Full-screen playlist only</option>{layouts.map((layout) => <option key={layout.id} value={layout.id}>{layout.name}</option>)}</select></label>
          {modal.form.layoutId && modal.form.playlistId ? (
            <p className="rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              This display has both a layout and a playlist. The playlist takes priority when it has slides; the layout is used only when the playlist is empty.
            </p>
          ) : null}
          <label className="block">
            <span className="app-label">Default dining menu</span>
            <select className="app-input" value={modal.form.diningMenuId || ""} onChange={(event) => patchForm({ diningMenuId: event.target.value })}>
              <option value="">Auto-select active menu</option>
              {diningMenus.map((menu) => (
                <option key={menu.id} value={menu.id}>
                  {menu.name} · Week of {menu.weekStartDate || "—"}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="app-label">Software version</span><input className="app-input" value={modal.form.softwareVersion || ""} onChange={(event) => patchForm({ softwareVersion: event.target.value })} /></label>
            <label className="block"><span className="app-label">Storage utilization (%)</span><input type="number" min="0" max="100" className="app-input" value={modal.form.storageUtilizationPct || 0} onChange={(event) => patchForm({ storageUtilizationPct: event.target.value })} /></label>
          </div>
          {playerUrl ? <PlayerUrlField url={playerUrl} /> : null}
          <label className="block"><span className="app-label">Notes</span><textarea className="app-input min-h-[80px]" rows={3} value={modal.form.notes} onChange={(event) => patchForm({ notes: event.target.value })} /></label>
        </ModalShell>
      ) : null}

      {modal?.type === "media" ? (
        <DigitalDashboardMediaModal
          form={modal.form}
          initialPath={modal.initialPath}
          saving={saving}
          canEdit={sectionCanEdit("media")}
          settings={settingsContext?.settings}
          mediaFolders={mediaFolders}
          rssFeeds={rssFeeds}
          onClose={closeModal}
          onSave={(form) => saveMediaItem(form)}
          onSaveBatch={onSaveMediaBatch ? (records) => saveMediaBatch(records) : undefined}
          onSaveRssFeed={onSaveRssFeed}
          onSyncRssFeed={onSyncRssFeed}
          onChange={(patch) => patchForm(patch)}
        />
      ) : null}

      {modal?.type === "playlist" ? (
        <ModalShell
          wide
          title={modal.form.id ? "Edit playlist" : "Add playlist"}
          onClose={closeModal}
          footer={
            <>
              <button type="button" className="app-btn-secondary px-4 py-2 text-xs" onClick={closeModal}>Cancel</button>
              <button type="button" disabled={saving} className="app-btn-primary px-4 py-2 text-xs" onClick={() => savePlaylist(modal.form)}>Save playlist</button>
            </>
          }
        >
          <label className="block"><span className="app-label">Playlist name</span><input className="app-input" value={modal.form.name} onChange={(event) => patchForm({ name: event.target.value })} required /></label>
          <label className="block"><span className="app-label">Description</span><textarea className="app-input min-h-[60px]" rows={2} value={modal.form.description} onChange={(event) => patchForm({ description: event.target.value })} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="app-label">Transition</span><select className="app-input" value={modal.form.transition} onChange={(event) => patchForm({ transition: event.target.value })}>{TRANSITION_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="block"><span className="app-label">Priority</span><input type="number" min="1" className="app-input" value={modal.form.priority || 1} onChange={(event) => patchForm({ priority: event.target.value })} /></label>
          </div>
          <label className="flex items-center gap-2 pt-1 text-sm text-[var(--color-afta-text)]"><input type="checkbox" checked={modal.form.loop !== false} onChange={(event) => patchForm({ loop: event.target.checked })} />Loop continuously</label>

          <fieldset className="rounded-[10px] border border-[var(--color-afta-border)] p-3">
            <legend className="px-1 text-xs font-semibold text-[var(--color-afta-muted)]">Quick add</legend>
            <div className="mt-2 space-y-3">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-subtle)]">Dining menus</p>
                {diningMenus.length ? (
                  <div className="flex flex-wrap gap-2">
                    {diningMenus.map((menu) => (
                      <button
                        key={menu.id}
                        type="button"
                        disabled={Boolean(quickAdding)}
                        onClick={() => quickAddDiningMenu(menu.id)}
                        className="rounded-full border border-[var(--color-afta-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-afta-text)] hover:border-[#c8102e]/40 disabled:opacity-60"
                      >
                        {quickAdding === menu.id ? "Adding…" : `+ ${menu.name}`}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--color-afta-muted)]">Publish a menu under Dining first.</p>
                )}
              </div>
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-subtle)]">Live widgets</p>
                <div className="flex flex-wrap gap-2">
                  {PLAYLIST_QUICK_WIDGETS.filter((type) => type !== "dining").map((widgetType) => {
                    const widget = WIDGET_TYPES.find((item) => item.value === widgetType);
                    return (
                      <button
                        key={widgetType}
                        type="button"
                        disabled={Boolean(quickAdding)}
                        onClick={() => quickAddWidget(widgetType)}
                        className="rounded-full border border-[var(--color-afta-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-afta-text)] hover:border-[#c8102e]/40 disabled:opacity-60"
                      >
                        {quickAdding === widgetType ? "Adding…" : `+ ${widget?.label || widgetType}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </fieldset>

          <fieldset className="rounded-[10px] border border-[var(--color-afta-border)] p-3">
            <legend className="px-1 text-xs font-semibold text-[var(--color-afta-muted)]">Playlist content</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { value: "all", label: "All" },
                { value: "media", label: "Media" },
                { value: "widgets", label: "Widgets" },
                { value: "dining", label: "Dining" },
              ].map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setPlaylistMediaFilter(filter.value)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    playlistMediaFilter === filter.value
                      ? "bg-[var(--color-afta-red)] text-white"
                      : "border border-[var(--color-afta-border)] text-[var(--color-afta-muted)]"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-subtle)]">Library items</p>
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {filteredPlaylistMedia.length ? filteredPlaylistMedia.map((item) => {
                    const selected = (modal.form.itemIds || []).includes(item.id);
                    return (
                      <label key={item.id} className="flex items-start gap-2 rounded-[8px] border border-[var(--color-afta-border)] px-2 py-2 text-sm">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selected}
                          onChange={() => {
                            if (selected) removePlaylistItem(item.id);
                            else patchForm({ itemIds: [...(modal.form.itemIds || []), item.id] });
                          }}
                        />
                        <span className="flex-1">
                          <span className="block font-medium">{item.title}</span>
                          <span className="block text-[10px] text-[var(--color-afta-muted)]">
                            {describePlaylistMediaItem(item, menusById)} · {formatDurationSeconds(item.durationSec)}
                          </span>
                        </span>
                      </label>
                    );
                  }) : <p className="text-xs text-[var(--color-afta-muted)]">No matching library items.</p>}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-subtle)]">Playback order</p>
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {(modal.form.itemIds || []).length ? (modal.form.itemIds || []).map((mediaId, index) => {
                    const item = mediaById[mediaId];
                    return (
                      <div key={mediaId} className="flex items-center gap-2 rounded-[8px] border border-[var(--color-afta-border)] px-2 py-1.5 text-sm">
                        <span className="w-5 text-xs font-semibold text-[var(--color-afta-muted)]">{index + 1}</span>
                        <span className="flex-1 truncate">
                          <span className="block truncate font-medium">{item?.title || mediaId}</span>
                          {item ? (
                            <span className="block truncate text-[10px] text-[var(--color-afta-muted)]">
                              {describePlaylistMediaItem(item, menusById)}
                            </span>
                          ) : null}
                        </span>
                        <button type="button" className="app-btn-secondary p-1" disabled={index === 0} onClick={() => movePlaylistItem(mediaId, "up")} aria-label="Move up">
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button type="button" className="app-btn-secondary p-1" disabled={index >= (modal.form.itemIds || []).length - 1} onClick={() => movePlaylistItem(mediaId, "down")} aria-label="Move down">
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button type="button" className="app-btn-secondary p-1 text-red-600" onClick={() => removePlaylistItem(mediaId)} aria-label="Remove">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  }) : <p className="text-xs text-[var(--color-afta-muted)]">Add menus, widgets, or media from the library.</p>}
                </div>
              </div>
            </div>
          </fieldset>
        </ModalShell>
      ) : null}

      {modal?.type === "schedule" ? (
        <ModalShell
          wide
          title={modal.form.id ? "Edit schedule" : "Add schedule"}
          onClose={closeModal}
          footer={
            <>
              <button type="button" className="app-btn-secondary px-4 py-2 text-xs" onClick={closeModal}>Cancel</button>
              <button type="button" disabled={saving} className="app-btn-primary px-4 py-2 text-xs" onClick={() => saveSchedule(modal.form)}>Save schedule</button>
            </>
          }
        >
          <label className="block"><span className="app-label">Schedule name</span><input className="app-input" value={modal.form.name} onChange={(event) => patchForm({ name: event.target.value })} required /></label>
          <label className="block"><span className="app-label">Playlist</span><select className="app-input" value={modal.form.playlistId} onChange={(event) => patchForm({ playlistId: event.target.value })} required><option value="">Select playlist</option>{playlists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.name}</option>)}</select></label>
          <fieldset className="rounded-[10px] border border-[var(--color-afta-border)] p-3">
            <legend className="px-1 text-xs font-semibold text-[var(--color-afta-muted)]">Target displays</legend>
            <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
              {displays.length ? displays.map((display) => (
                <label key={display.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={(modal.form.displayIds || []).includes(display.id)} onChange={() => toggleInForm("displayIds", display.id)} />
                  {display.name}
                </label>
              )) : <p className="text-xs text-[var(--color-afta-muted)]">Register displays first.</p>}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-1">
            {DAY_LABELS.map((label, index) => (
              <button
                key={label}
                type="button"
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  (modal.form.daysOfWeek || []).includes(index)
                    ? "bg-[var(--color-afta-red)] text-white"
                    : "border border-[var(--color-afta-border)] text-[var(--color-afta-muted)]"
                }`}
                onClick={() => toggleInForm("daysOfWeek", index)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="app-label">Start date (optional)</span><input type="date" className="app-input" value={modal.form.startDate || ""} onChange={(event) => patchForm({ startDate: event.target.value })} /></label>
            <label className="block"><span className="app-label">End date (optional)</span><input type="date" className="app-input" value={modal.form.endDate || ""} onChange={(event) => patchForm({ endDate: event.target.value })} /></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block"><span className="app-label">Start time</span><input type="time" className="app-input" value={modal.form.startTime} onChange={(event) => patchForm({ startTime: event.target.value })} /></label>
            <label className="block"><span className="app-label">End time</span><input type="time" className="app-input" value={modal.form.endTime} onChange={(event) => patchForm({ endTime: event.target.value })} /></label>
            <label className="block"><span className="app-label">Priority</span><input type="number" min="1" className="app-input" value={modal.form.priority} onChange={(event) => patchForm({ priority: event.target.value })} /></label>
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--color-afta-text)]"><input type="checkbox" checked={modal.form.active !== false} onChange={(event) => patchForm({ active: event.target.checked })} />Schedule is active</label>
        </ModalShell>
      ) : null}
    </div>
  );
}

function ListTable({ rows, columns, renderRow, empty }) {
  if (!rows.length) {
    return <p className="px-4 py-10 text-center text-sm text-[var(--color-afta-muted)]">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">
          <tr>{columns.map((column) => <th key={column} className="px-4 py-2">{column}</th>)}</tr>
        </thead>
        <tbody>{rows.map(renderRow)}</tbody>
      </table>
    </div>
  );
}

function RowActions({ canEdit, onPreview, onEdit, onDelete }) {
  if (!canEdit && !onPreview) return null;
  return (
    <div className="flex justify-end gap-1">
      {onPreview ? (
        <button type="button" className="app-btn-secondary p-2" onClick={onPreview} aria-label="Preview">
          <Play className="h-4 w-4" />
        </button>
      ) : null}
      {canEdit && onEdit ? (
        <button type="button" className="app-btn-secondary p-2" onClick={onEdit} aria-label="Edit">
          <Pencil className="h-4 w-4" />
        </button>
      ) : null}
      {canEdit && onDelete ? (
        <button type="button" className="app-btn-secondary p-2 text-red-600 hover:text-red-700" onClick={onDelete} aria-label="Delete">
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
