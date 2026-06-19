import { useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Check,
  CirclePlus,
  Folder,
  FolderOpen,
  Loader2,
  Pencil,
  RefreshCw,
  Rss,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import DigitalDashboardLibraryShell, {
  LibraryFilterPill,
  LibraryStatusBadge,
} from "./DigitalDashboardLibraryShell.jsx";
import {
  createDigitalDashboardId,
  defaultMediaFolderForm,
  defaultMediaForm,
  defaultRssFeedForm,
  filterLibraryRecords,
  formatDurationSeconds,
  MEDIA_ADD_PATHS,
  MEDIA_APPROVAL_STATUS_LABELS,
  MEDIA_APPROVAL_STATUSES,
  MEDIA_FILE_TYPES,
  MEDIA_SOURCES,
  mediaAddPathForType,
  mediaTypeLabel,
} from "../../lib/digitalDashboard.js";
import {
  approvalStatusTone,
  buildMediaUsageMap,
  enrichMediaWithUsage,
  filterMediaByApproval,
  filterMediaByFolder,
} from "../../lib/digitalDashboardMediaLibrary.js";
import {
  formatMediaFileSize,
  inferMediaTypeFromFile,
  uploadDigitalDashboardMediaFile,
} from "../../lib/digitalDashboardMediaStorage.js";
import {
  isMediaApprovalRequired,
  isRssFeedsEnabled,
} from "../../lib/systemSettings.js";

const APPROVAL_CLASS = {
  success: "border-green-200 bg-green-50 text-green-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  critical: "border-red-200 bg-red-50 text-red-800",
  info: "border-slate-200 bg-slate-100 text-slate-700",
};

function ApprovalBadge({ status }) {
  const tone = approvalStatusTone(status);
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${APPROVAL_CLASS[tone]}`}
    >
      {MEDIA_APPROVAL_STATUS_LABELS[status] || status || "Approved"}
    </span>
  );
}

function sourceLabel(item) {
  if (item.source === MEDIA_SOURCES.RSS) return "RSS";
  if (item.source === MEDIA_SOURCES.STOCK) return "Stock";
  if (item.storagePath) return "Uploaded";
  if (item.url) return "URL";
  return "Text";
}

/**
 * @param {{
 *   media?: Record<string, unknown>[],
 *   playlists?: Record<string, unknown>[],
 *   schedules?: Record<string, unknown>[],
 *   mediaFolders?: Record<string, unknown>[],
 *   rssFeeds?: Record<string, unknown>[],
 *   query?: string,
 *   onQueryChange?: (value: string) => void,
 *   canEdit?: boolean,
 *   settings?: Record<string, Record<string, unknown>> | null,
 *   userId?: string,
 *   onSaveMediaBatch?: (records: Record<string, unknown>[]) => Promise<void>,
 *   onUpdateApproval?: (mediaId: string, status: string, meta?: { notes?: string, userId?: string }) => Promise<void>,
 *   onDeleteMedia?: (id: string) => Promise<void>,
 *   onSaveFolder?: (record: Record<string, unknown>) => Promise<void>,
 *   onDeleteFolder?: (id: string) => Promise<void>,
 *   onSaveRssFeed?: (record: Record<string, unknown>) => Promise<void>,
 *   onDeleteRssFeed?: (id: string) => Promise<void>,
 *   onSyncRssFeed?: (feedId: string) => Promise<{ created?: number, updated?: number, itemCount?: number }>,
 *   onAddMedia?: (formOverrides?: Record<string, unknown>, initialPath?: string) => void,
 *   onEditMedia?: (item: Record<string, unknown>) => void,
 * }} props
 */
export default function DigitalDashboardMediaLibrary({
  media = [],
  playlists = [],
  schedules = [],
  mediaFolders = [],
  rssFeeds = [],
  query = "",
  onQueryChange,
  canEdit = false,
  settings = null,
  userId = "",
  onSaveMediaBatch,
  onUpdateApproval,
  onDeleteMedia,
  onSaveFolder,
  onDeleteFolder,
  onSaveRssFeed,
  onDeleteRssFeed,
  onSyncRssFeed,
  onAddMedia,
  onEditMedia,
}) {
  const bulkInputRef = useRef(null);
  const [folderFilter, setFolderFilter] = useState("all");
  const [mediaTypeFilter, setMediaTypeFilter] = useState("all");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [bulkUploading, setBulkUploading] = useState(false);
  const [syncingFeedId, setSyncingFeedId] = useState("");
  const [usageItem, setUsageItem] = useState(null);
  const [folderModal, setFolderModal] = useState(null);
  const [rssModal, setRssModal] = useState(null);
  const [savingFolder, setSavingFolder] = useState(false);
  const [savingRss, setSavingRss] = useState(false);

  const approvalRequired = isMediaApprovalRequired(settings);
  const rssEnabled = isRssFeedsEnabled(settings);

  const foldersById = useMemo(
    () => Object.fromEntries(mediaFolders.map((folder) => [folder.id, folder])),
    [mediaFolders],
  );

  const usageMap = useMemo(
    () => buildMediaUsageMap(media, playlists, schedules),
    [media, playlists, schedules],
  );

  const enrichedMedia = useMemo(
    () => enrichMediaWithUsage(media, usageMap),
    [media, usageMap],
  );

  const filteredMedia = useMemo(() => {
    let rows = enrichedMedia;
    rows = filterMediaByFolder(rows, folderFilter);
    rows = filterMediaByApproval(rows, approvalFilter);
    if (mediaTypeFilter !== "all") {
      rows = rows.filter((item) => item.type === mediaTypeFilter);
    }
    return filterLibraryRecords(rows, query, [
      "title",
      "content",
      "description",
      "url",
      "tags",
      "category",
      "fileName",
      "stockCredit",
    ]);
  }, [enrichedMedia, folderFilter, approvalFilter, mediaTypeFilter, query]);

  const pendingCount = useMemo(
    () =>
      media.filter(
        (item) =>
          item.approvalStatus === MEDIA_APPROVAL_STATUSES.PENDING ||
          item.approvalStatus === MEDIA_APPROVAL_STATUSES.DRAFT,
      ).length,
    [media],
  );

  async function handleBulkUpload(files) {
    if (!files?.length || !canEdit || !onSaveMediaBatch) return;
    setBulkUploading(true);
    try {
      const records = [];
      for (const file of files) {
        const mediaType = inferMediaTypeFromFile(file);
        const mediaId = createDigitalDashboardId("DDM");
        const result = await uploadDigitalDashboardMediaFile(mediaId, file, mediaType);
        records.push(
          defaultMediaForm({
            id: mediaId,
            type: mediaType,
            title: result.fileName?.replace(/\.[^.]+$/, "") || "Uploaded media",
            url: result.url,
            storagePath: result.storagePath,
            fileName: result.fileName,
            fileSize: result.fileSize,
            mimeType: result.mimeType,
            folderId: folderFilter !== "all" && folderFilter !== "uncategorized" ? folderFilter : "",
            source: MEDIA_SOURCES.UPLOAD,
            approvalStatus: approvalRequired
              ? MEDIA_APPROVAL_STATUSES.PENDING
              : MEDIA_APPROVAL_STATUSES.APPROVED,
          }),
        );
      }
      await onSaveMediaBatch(records);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Bulk upload failed.");
    } finally {
      setBulkUploading(false);
    }
  }

  async function handleApproval(mediaId, status) {
    if (!canEdit || !onUpdateApproval) return;
    const notes =
      status === MEDIA_APPROVAL_STATUSES.REJECTED
        ? window.prompt("Rejection notes (optional):") || ""
        : "";
    await onUpdateApproval(mediaId, status, { notes, userId });
  }

  async function handleDeleteMedia(id) {
    if (!canEdit || !onDeleteMedia) return;
    if (!window.confirm("Delete this media item?")) return;
    await onDeleteMedia(id);
  }

  async function submitFolder(form) {
    if (!canEdit || !onSaveFolder) return;
    setSavingFolder(true);
    try {
      await onSaveFolder({ ...form, id: form.id || createDigitalDashboardId("DDF") });
      setFolderModal(null);
    } finally {
      setSavingFolder(false);
    }
  }

  async function submitRssFeed(form) {
    if (!canEdit || !onSaveRssFeed) return;
    setSavingRss(true);
    try {
      await onSaveRssFeed({ ...form, id: form.id || createDigitalDashboardId("DDR") });
      setRssModal(null);
    } finally {
      setSavingRss(false);
    }
  }

  async function handleSyncFeed(feedId) {
    if (!canEdit || !onSyncRssFeed) return;
    setSyncingFeedId(feedId);
    try {
      const result = await onSyncRssFeed(feedId);
      window.alert(
        `RSS sync complete: ${result?.created ?? 0} new, ${result?.updated ?? 0} updated (${result?.itemCount ?? 0} items in feed).`,
      );
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "RSS sync failed.");
    } finally {
      setSyncingFeedId("");
    }
  }

  return (
    <>
      <DigitalDashboardLibraryShell
        title="Media Library"
        query={query}
        onQueryChange={onQueryChange}
        searchPlaceholder="Search media"
        totalItems={filteredMedia.length}
        filters={
          <>
            <LibraryFilterPill
              label="All types"
              active={mediaTypeFilter === "all"}
              count={media.length}
              onClick={() => setMediaTypeFilter("all")}
            />
            {MEDIA_FILE_TYPES.map((item) => (
              <LibraryFilterPill
                key={item.value}
                label={item.label}
                active={mediaTypeFilter === item.value}
                count={media.filter((row) => row.type === item.value).length}
                onClick={() => setMediaTypeFilter(item.value)}
              />
            ))}
            {approvalRequired ? (
              <>
                <LibraryFilterPill
                  label="Pending approval"
                  active={approvalFilter === "pending"}
                  count={pendingCount}
                  onClick={() => setApprovalFilter("pending")}
                />
                <LibraryFilterPill
                  label="Approved"
                  active={approvalFilter === MEDIA_APPROVAL_STATUSES.APPROVED}
                  onClick={() => setApprovalFilter(MEDIA_APPROVAL_STATUSES.APPROVED)}
                />
                {approvalFilter !== "all" ? (
                  <LibraryFilterPill label="All approval" active onClick={() => setApprovalFilter("all")} />
                ) : null}
              </>
            ) : null}
          </>
        }
        actions={
          canEdit ? (
            <>
              <input
                ref={bulkInputRef}
                type="file"
                multiple
                className="hidden"
                accept="image/*,video/*,application/pdf,.ppt,.pptx"
                onChange={(event) => {
                  const files = [...(event.target.files || [])];
                  event.target.value = "";
                  if (files.length) handleBulkUpload(files);
                }}
              />
              <button
                type="button"
                disabled={bulkUploading || !onSaveMediaBatch}
                className="app-btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-xs disabled:opacity-60"
                onClick={() => bulkInputRef.current?.click()}
              >
                {bulkUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {bulkUploading ? "Uploading…" : "Bulk upload"}
              </button>
              <button
                type="button"
                className="app-btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-xs"
                onClick={() => onAddMedia?.({}, MEDIA_ADD_PATHS.BULK_UPLOAD)}
              >
                <Upload className="h-4 w-4" />
                Bulk wizard
              </button>
              {rssEnabled ? (
                <button
                  type="button"
                  className="app-btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-xs"
                  onClick={() => setRssModal(defaultRssFeedForm())}
                >
                  <Rss className="h-4 w-4" />
                  RSS feed
                </button>
              ) : null}
              <button
                type="button"
                className="app-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs"
                onClick={() => onAddMedia?.()}
              >
                <CirclePlus className="h-4 w-4" />
                Add media
              </button>
            </>
          ) : null
        }
      >
        <div className="grid lg:grid-cols-[220px_1fr]">
          <aside className="border-b border-[var(--color-afta-border)] bg-slate-50 p-4 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">
                Collections
              </p>
              {canEdit ? (
                <button
                  type="button"
                  className="app-btn-secondary p-1.5"
                  aria-label="New folder"
                  onClick={() => setFolderModal(defaultMediaFolderForm())}
                >
                  <CirclePlus className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            <nav className="mt-3 space-y-1">
              {[
                { id: "all", label: "All media", count: media.length },
                { id: "uncategorized", label: "Uncategorized", count: media.filter((item) => !item.folderId).length },
              ].map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setFolderFilter(row.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-[8px] px-3 py-2 text-left text-sm ${
                    folderFilter === row.id
                      ? "bg-white font-semibold text-[var(--color-afta-red)] shadow-sm"
                      : "text-[var(--color-afta-muted)] hover:bg-white/70"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 shrink-0" />
                    {row.label}
                  </span>
                  <span className="text-[10px] font-bold text-[var(--color-afta-subtle)]">{row.count}</span>
                </button>
              ))}
              {mediaFolders.map((folder) => (
                <div key={folder.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFolderFilter(folder.id)}
                    className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-[8px] px-3 py-2 text-left text-sm ${
                      folderFilter === folder.id
                        ? "bg-white font-semibold text-[var(--color-afta-red)] shadow-sm"
                        : "text-[var(--color-afta-muted)] hover:bg-white/70"
                    }`}
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <Folder className="h-4 w-4 shrink-0" style={{ color: folder.color || undefined }} />
                      <span className="truncate">{folder.name}</span>
                    </span>
                    <span className="text-[10px] font-bold text-[var(--color-afta-subtle)]">
                      {media.filter((item) => item.folderId === folder.id).length}
                    </span>
                  </button>
                  {canEdit ? (
                    <button
                      type="button"
                      className="app-btn-secondary hidden p-1.5 group-hover:inline-flex"
                      aria-label={`Edit ${folder.name}`}
                      onClick={() => setFolderModal({ ...folder })}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
              ))}
            </nav>

            {rssEnabled && rssFeeds.length ? (
              <div className="mt-6 border-t border-[var(--color-afta-border)] pt-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">
                  RSS feeds
                </p>
                <ul className="mt-2 space-y-2">
                  {rssFeeds.map((feed) => (
                    <li
                      key={feed.id}
                      className="rounded-[8px] border border-[var(--color-afta-border)] bg-white px-3 py-2 text-xs"
                    >
                      <p className="font-semibold text-[var(--color-afta-text)]">{feed.name}</p>
                      <p className="mt-0.5 truncate text-[10px] text-[var(--color-afta-muted)]">{feed.feedUrl}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {canEdit ? (
                          <>
                            <button
                              type="button"
                              disabled={syncingFeedId === feed.id}
                              className="app-btn-secondary inline-flex items-center gap-1 px-2 py-1 text-[10px] disabled:opacity-60"
                              onClick={() => handleSyncFeed(feed.id)}
                            >
                              {syncingFeedId === feed.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3 w-3" />
                              )}
                              Sync
                            </button>
                            <button
                              type="button"
                              className="app-btn-secondary px-2 py-1 text-[10px]"
                              onClick={() => setRssModal({ ...feed })}
                            >
                              Edit
                            </button>
                          </>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--color-afta-border)] bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Folder</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Impressions</th>
                  <th className="px-4 py-3">Usage</th>
                  {approvalRequired ? <th className="px-4 py-3">Approval</th> : null}
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filteredMedia.length ? (
                  filteredMedia.map((item) => (
                    <tr key={item.id} className="border-t border-[var(--color-afta-border)] hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.type === "image" && item.url ? (
                            <img
                              src={item.url}
                              alt=""
                              className="h-10 w-14 rounded-[6px] border border-[var(--color-afta-border)] object-cover"
                            />
                          ) : (
                            <span className="grid h-10 w-14 place-items-center rounded-[6px] bg-slate-100 text-[10px] font-semibold uppercase text-[var(--color-afta-muted)]">
                              {mediaTypeLabel(item.type).slice(0, 4)}
                            </span>
                          )}
                          <div>
                            <strong className="block text-sm">{item.title}</strong>
                            <span className="text-xs text-[var(--color-afta-muted)]">
                              {item.description || item.content || item.fileName || "—"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{mediaTypeLabel(item.type)}</td>
                      <td className="px-4 py-3 text-sm">
                        {item.folderId ? foldersById[item.folderId]?.name || "Folder" : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm">{formatDurationSeconds(item.durationSec)}</td>
                      <td className="px-4 py-3 text-sm tabular-nums">{Number(item.impressionCount) || 0}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-afta-red)]"
                          onClick={() => setUsageItem(item)}
                        >
                          <BarChart3 className="h-3.5 w-3.5" />
                          {item.usagePlaylistCount || 0} playlists
                        </button>
                      </td>
                      {approvalRequired ? (
                        <td className="px-4 py-3">
                          <ApprovalBadge status={item.approvalStatus || MEDIA_APPROVAL_STATUSES.APPROVED} />
                        </td>
                      ) : null}
                      <td className="px-4 py-3">
                        <LibraryStatusBadge active={item.active !== false} />
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--color-afta-muted)]">{sourceLabel(item)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {canEdit &&
                          approvalRequired &&
                          (item.approvalStatus === MEDIA_APPROVAL_STATUSES.PENDING ||
                            item.approvalStatus === MEDIA_APPROVAL_STATUSES.DRAFT) ? (
                            <>
                              <button
                                type="button"
                                className="app-btn-secondary p-2 text-green-700"
                                aria-label="Approve"
                                onClick={() => handleApproval(item.id, MEDIA_APPROVAL_STATUSES.APPROVED)}
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="app-btn-secondary p-2 text-red-600"
                                aria-label="Reject"
                                onClick={() => handleApproval(item.id, MEDIA_APPROVAL_STATUSES.REJECTED)}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : null}
                          {canEdit ? (
                            <button
                              type="button"
                              className="app-btn-secondary p-2"
                              aria-label="Edit"
                              onClick={() =>
                                onEditMedia?.({
                                  ...item,
                                  tags: item.tags || [],
                                  initialPath: mediaAddPathForType(item.type),
                                })
                              }
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          ) : null}
                          {canEdit ? (
                            <button
                              type="button"
                              className="app-btn-secondary p-2 text-red-600"
                              aria-label="Delete"
                              onClick={() => handleDeleteMedia(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={approvalRequired ? 10 : 9}
                      className="px-4 py-16 text-center text-sm text-[var(--color-afta-muted)]"
                    >
                      Upload images, video, RSS items, and stock media for campus playlists.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DigitalDashboardLibraryShell>

      {usageItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setUsageItem(null)}>
          <div className="app-panel w-full max-w-md p-5" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-afta-text)]">Usage analytics</h3>
                <p className="mt-1 text-xs text-[var(--color-afta-muted)]">{usageItem.title}</p>
              </div>
              <button type="button" className="app-btn-secondary p-2" onClick={() => setUsageItem(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-afta-muted)]">Display impressions</dt>
                <dd className="font-semibold tabular-nums">{Number(usageItem.impressionCount) || 0}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-afta-muted)]">Playlists</dt>
                <dd className="font-semibold tabular-nums">{usageItem.usagePlaylistCount || 0}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-afta-muted)]">Schedules</dt>
                <dd className="font-semibold tabular-nums">{usageItem.usageScheduleCount || 0}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-afta-muted)]">Usage score</dt>
                <dd className="font-semibold tabular-nums">{usageItem.usageScore || 0}</dd>
              </div>
            </dl>
            {(usageItem.usagePlaylistNames?.length || usageItem.usageScheduleNames?.length) ? (
              <div className="mt-4 space-y-2 text-xs text-[var(--color-afta-muted)]">
                {usageItem.usagePlaylistNames?.length ? (
                  <p>
                    <strong className="text-[var(--color-afta-text)]">Playlists:</strong>{" "}
                    {usageItem.usagePlaylistNames.join(", ")}
                  </p>
                ) : null}
                {usageItem.usageScheduleNames?.length ? (
                  <p>
                    <strong className="text-[var(--color-afta-text)]">Schedules:</strong>{" "}
                    {usageItem.usageScheduleNames.join(", ")}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {folderModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setFolderModal(null)}>
          <div className="app-panel w-full max-w-md p-5" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-sm font-semibold text-[var(--color-afta-text)]">
              {folderModal.id ? "Edit folder" : "New folder"}
            </h3>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="app-label">Folder name</span>
                <input
                  className="app-input"
                  value={folderModal.name}
                  onChange={(event) => setFolderModal({ ...folderModal, name: event.target.value })}
                />
              </label>
              <label className="block">
                <span className="app-label">Color</span>
                <input
                  type="color"
                  className="h-10 w-full cursor-pointer rounded-[8px] border border-[var(--color-afta-border)]"
                  value={folderModal.color || "#c8102e"}
                  onChange={(event) => setFolderModal({ ...folderModal, color: event.target.value })}
                />
              </label>
              <label className="block">
                <span className="app-label">Description</span>
                <textarea
                  className="app-input min-h-[72px]"
                  rows={3}
                  value={folderModal.description || ""}
                  onChange={(event) => setFolderModal({ ...folderModal, description: event.target.value })}
                />
              </label>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {folderModal.id && canEdit && onDeleteFolder ? (
                <button
                  type="button"
                  className="app-btn-secondary mr-auto px-3 py-2 text-xs text-red-700"
                  onClick={async () => {
                    if (!window.confirm("Delete this folder? Media stays in the library.")) return;
                    await onDeleteFolder(folderModal.id);
                    setFolderModal(null);
                  }}
                >
                  Delete folder
                </button>
              ) : null}
              <button type="button" className="app-btn-secondary px-4 py-2 text-xs" onClick={() => setFolderModal(null)}>
                Cancel
              </button>
              <button
                type="button"
                disabled={savingFolder || !folderModal.name}
                className="app-btn-primary px-4 py-2 text-xs disabled:opacity-60"
                onClick={() => submitFolder(folderModal)}
              >
                Save folder
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {rssModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRssModal(null)}>
          <div className="app-panel w-full max-w-md p-5" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-sm font-semibold text-[var(--color-afta-text)]">
              {rssModal.id ? "Edit RSS feed" : "Add RSS feed"}
            </h3>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="app-label">Feed name</span>
                <input
                  className="app-input"
                  value={rssModal.name}
                  onChange={(event) => setRssModal({ ...rssModal, name: event.target.value })}
                />
              </label>
              <label className="block">
                <span className="app-label">Feed URL</span>
                <input
                  className="app-input"
                  value={rssModal.feedUrl}
                  onChange={(event) => setRssModal({ ...rssModal, feedUrl: event.target.value })}
                  placeholder="https://…/feed.xml"
                />
              </label>
              <label className="block">
                <span className="app-label">Target folder</span>
                <select
                  className="app-input"
                  value={rssModal.folderId || ""}
                  onChange={(event) => setRssModal({ ...rssModal, folderId: event.target.value })}
                >
                  <option value="">Uncategorized</option>
                  {mediaFolders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {rssModal.id && canEdit && onDeleteRssFeed ? (
                <button
                  type="button"
                  className="app-btn-secondary mr-auto px-3 py-2 text-xs text-red-700"
                  onClick={async () => {
                    if (!window.confirm("Delete this RSS feed? Imported media stays in the library.")) return;
                    await onDeleteRssFeed(rssModal.id);
                    setRssModal(null);
                  }}
                >
                  Delete feed
                </button>
              ) : null}
              <button type="button" className="app-btn-secondary px-4 py-2 text-xs" onClick={() => setRssModal(null)}>
                Cancel
              </button>
              <button
                type="button"
                disabled={savingRss || !rssModal.name || !rssModal.feedUrl}
                className="app-btn-primary px-4 py-2 text-xs disabled:opacity-60"
                onClick={() => submitRssFeed(rssModal)}
              >
                Save feed
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
