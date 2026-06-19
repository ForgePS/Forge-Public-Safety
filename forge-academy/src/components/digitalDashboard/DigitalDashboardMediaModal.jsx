import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  Film,
  Globe,
  ImageIcon,
  Link2,
  Loader2,
  Megaphone,
  Rss,
  Sparkles,
  Trash2,
  Type,
  Upload,
  X,
} from "lucide-react";
import {
  createDigitalDashboardId,
  defaultMediaForm,
  defaultRssFeedForm,
  MEDIA_ADD_PATHS,
  MEDIA_APPROVAL_STATUSES,
  MEDIA_CATEGORIES,
  MEDIA_FILE_TYPES,
  MEDIA_SOURCES,
  mediaAddPathForType,
  mediaTypeForAddPath,
} from "../../lib/digitalDashboard.js";
import {
  mediaRecordFromStockAsset,
  STOCK_MEDIA_CATALOG,
} from "../../lib/digitalDashboardMediaLibrary.js";
import {
  formatMediaFileSize,
  getMediaUploadAccept,
  inferMediaTypeFromFile,
  mediaTypeSupportsUpload,
  uploadDigitalDashboardMediaFile,
} from "../../lib/digitalDashboardMediaStorage.js";
import {
  isMediaApprovalRequired,
  isRssFeedsEnabled,
  isStockMediaEnabled,
} from "../../lib/systemSettings.js";

/**
 * @param {{
 *   form: ReturnType<typeof defaultMediaForm>,
 *   initialPath?: string,
 *   saving?: boolean,
 *   canEdit?: boolean,
 *   settings?: Record<string, Record<string, unknown>> | null,
 *   mediaFolders?: Record<string, unknown>[],
 *   rssFeeds?: Record<string, unknown>[],
 *   onClose: () => void,
 *   onSave: (form: ReturnType<typeof defaultMediaForm>) => void,
 *   onSaveBatch?: (records: Record<string, unknown>[]) => void,
 *   onSaveRssFeed?: (record: Record<string, unknown>) => Promise<void>,
 *   onSyncRssFeed?: (feedId: string) => Promise<unknown>,
 *   onChange: (patch: Partial<ReturnType<typeof defaultMediaForm>>) => void,
 * }} props
 */
export default function DigitalDashboardMediaModal({
  form,
  initialPath,
  saving = false,
  canEdit = true,
  settings = null,
  mediaFolders = [],
  rssFeeds = [],
  onClose,
  onSave,
  onSaveBatch,
  onSaveRssFeed,
  onSyncRssFeed,
  onChange,
}) {
  const inputRef = useRef(null);
  const bulkInputRef = useRef(null);
  const [activePath, setActivePath] = useState(initialPath || mediaAddPathForType(form.type));
  const [uploading, setUploading] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [rssForm, setRssForm] = useState(defaultRssFeedForm());
  const [syncingFeedId, setSyncingFeedId] = useState("");
  const [selectedStockId, setSelectedStockId] = useState("");

  const approvalRequired = isMediaApprovalRequired(settings);
  const rssEnabled = isRssFeedsEnabled(settings);
  const stockEnabled = isStockMediaEnabled(settings);

  const navSections = useMemo(() => {
    const sections = [
      {
        id: "general",
        label: "General",
        items: [
          { path: MEDIA_ADD_PATHS.GENERAL_FILE, label: "File upload", icon: Upload },
          { path: MEDIA_ADD_PATHS.BULK_UPLOAD, label: "Bulk upload", icon: Upload },
          { path: MEDIA_ADD_PATHS.GENERAL_TEXT, label: "Text slide", icon: Type },
          { path: MEDIA_ADD_PATHS.GENERAL_ANNOUNCEMENT, label: "Announcement", icon: Megaphone },
        ],
      },
      {
        id: "web",
        label: "Web",
        items: [{ path: MEDIA_ADD_PATHS.WEB_URL, label: "Web URL", icon: Link2 }],
      },
      {
        id: "html",
        label: "HTML",
        items: [{ path: MEDIA_ADD_PATHS.HTML_EMBED, label: "Embed / iframe", icon: Globe }],
      },
    ];
    if (rssEnabled) {
      sections.push({
        id: "rss",
        label: "RSS",
        items: [{ path: MEDIA_ADD_PATHS.RSS_FEED, label: "RSS feed", icon: Rss }],
      });
    }
    if (stockEnabled) {
      sections.push({
        id: "stock",
        label: "Stock",
        items: [{ path: MEDIA_ADD_PATHS.STOCK_MEDIA, label: "Stock library", icon: Sparkles }],
      });
    }
    return sections;
  }, [rssEnabled, stockEnabled]);

  useEffect(() => {
    setActivePath(initialPath || mediaAddPathForType(form.type));
  }, [form.id, initialPath, form.type]);

  const isFilePath = activePath === MEDIA_ADD_PATHS.GENERAL_FILE;
  const isBulkPath = activePath === MEDIA_ADD_PATHS.BULK_UPLOAD;
  const isTextPath = activePath === MEDIA_ADD_PATHS.GENERAL_TEXT;
  const isAnnouncementPath = activePath === MEDIA_ADD_PATHS.GENERAL_ANNOUNCEMENT;
  const isWebPath = activePath === MEDIA_ADD_PATHS.WEB_URL;
  const isHtmlPath = activePath === MEDIA_ADD_PATHS.HTML_EMBED;
  const isRssPath = activePath === MEDIA_ADD_PATHS.RSS_FEED;
  const isStockPath = activePath === MEDIA_ADD_PATHS.STOCK_MEDIA;

  const acceptTypes = useMemo(() => getMediaUploadAccept(form.type), [form.type]);

  function selectPath(path) {
    setActivePath(path);
    setUploadError(null);
    if (path === MEDIA_ADD_PATHS.GENERAL_FILE && !mediaTypeSupportsUpload(form.type)) {
      onChange({ type: "image" });
    } else if (path !== MEDIA_ADD_PATHS.GENERAL_FILE && path !== MEDIA_ADD_PATHS.BULK_UPLOAD) {
      onChange({ type: mediaTypeForAddPath(path) });
    }
  }

  async function processFile(file) {
    if (!file || !canEdit) return;

    let mediaType = form.type;
    if (!mediaTypeSupportsUpload(mediaType)) {
      mediaType = inferMediaTypeFromFile(file);
      onChange({ type: mediaType });
    }

    setUploading(true);
    setUploadError(null);
    try {
      const mediaId = form.id || createDigitalDashboardId("DDM");
      const result = await uploadDigitalDashboardMediaFile(mediaId, file, mediaType);
      onChange({
        type: mediaType,
        url: result.url,
        storagePath: result.storagePath,
        fileName: result.fileName,
        fileSize: result.fileSize,
        mimeType: result.mimeType,
        id: mediaId,
        title: form.title || result.fileName?.replace(/\.[^.]+$/, "") || form.title,
      });
      setActivePath(MEDIA_ADD_PATHS.GENERAL_FILE);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Unable to upload file.");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function openFilePicker() {
    if (!canEdit || uploading) return;
    inputRef.current?.click();
  }

  async function processBulkFiles(files) {
    if (!files?.length || !canEdit || !onSaveBatch) return;
    setBulkUploading(true);
    setUploadError(null);
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
            folderId: form.folderId || "",
            source: MEDIA_SOURCES.UPLOAD,
            approvalStatus: approvalRequired
              ? MEDIA_APPROVAL_STATUSES.PENDING
              : MEDIA_APPROVAL_STATUSES.APPROVED,
          }),
        );
      }
      await onSaveBatch(records);
      onClose();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Bulk upload failed.");
    } finally {
      setBulkUploading(false);
    }
  }

  function importStockAsset(asset) {
    setSelectedStockId(asset.id);
    const record = mediaRecordFromStockAsset(asset, { mediaApprovalRequired: approvalRequired });
    onChange({
      ...record,
      id: form.id || createDigitalDashboardId("DDM"),
      folderId: form.folderId || "",
    });
  }

  function handleSaveClick() {
    if (isStockPath && selectedStockId) {
      onSave({
        ...form,
        id: form.id || createDigitalDashboardId("DDM"),
        approvalStatus: approvalRequired
          ? form.approvalStatus || MEDIA_APPROVAL_STATUSES.PENDING
          : MEDIA_APPROVAL_STATUSES.APPROVED,
      });
      return;
    }
    onSave(form);
  }

  async function handleSaveRssFeed() {
    if (!onSaveRssFeed) return;
    await onSaveRssFeed({ ...rssForm, id: rssForm.id || createDigitalDashboardId("DDR") });
    setRssForm(defaultRssFeedForm({ folderId: form.folderId || "" }));
  }

  async function handleSyncRssFeed(feedId) {
    if (!onSyncRssFeed) return;
    setSyncingFeedId(feedId);
    try {
      await onSyncRssFeed(feedId);
    } finally {
      setSyncingFeedId("");
    }
  }

  function clearUploadedFile() {
    onChange({
      url: "",
      storagePath: "",
      fileName: "",
      fileSize: 0,
      mimeType: "",
    });
  }

  function renderPreview() {
    if (form.type === "image" && form.url) {
      return <img src={form.url} alt="" className="max-h-40 w-full rounded-[8px] object-contain" />;
    }
    if (form.type === "video" && form.url) {
      return (
        <video src={form.url} className="max-h-40 w-full rounded-[8px] bg-black object-contain" controls muted />
      );
    }
    if (form.content) {
      return (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-afta-text)]">{form.content}</p>
      );
    }
    if (form.url) {
      return (
        <p className="break-all font-mono text-[10px] text-[var(--color-afta-muted)]">{form.url}</p>
      );
    }
    return <p className="text-xs text-[var(--color-afta-muted)]">Preview appears after you add content.</p>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="app-panel flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-afta-border)] px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-[var(--color-afta-text)]">
              {form.id ? "Edit Media" : "Add Media"}
            </h3>
            <p className="mt-0.5 text-xs text-[var(--color-afta-muted)]">
              MVIX-style library · {activePath.replace("/", " · ")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isFilePath ? (
              <button
                type="button"
                disabled={!canEdit || uploading}
                className="app-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs disabled:opacity-60"
                onClick={openFilePicker}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Uploading…" : "Upload file"}
              </button>
            ) : null}
            <button type="button" className="app-btn-secondary p-2" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[210px_1fr_280px]">
          <aside className="border-b border-[var(--color-afta-border)] bg-slate-50 p-3 lg:border-b-0 lg:border-r">
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">
              Media source
            </p>
            <nav className="space-y-4">
              {navSections.map((section) => (
                <div key={section.id}>
                  <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-afta-subtle)]">
                    {section.label}
                  </p>
                  <div className="space-y-1">
                    {section.items.map(({ path, label, icon: Icon }) => (
                      <button
                        key={path}
                        type="button"
                        onClick={() => selectPath(path)}
                        className={`flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-sm font-medium ${
                          activePath === path
                            ? "bg-white text-[var(--color-afta-red)] shadow-sm"
                            : "text-[var(--color-afta-muted)] hover:bg-white/70"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          <div className="flex min-h-0 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5">
              {isFilePath ? (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-afta-text)]">Choose file type</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      {MEDIA_FILE_TYPES.map((item) => {
                        const selected = form.type === item.value;
                        const Icon =
                          item.value === "video"
                            ? Film
                            : item.value === "pdf" || item.value === "office"
                              ? FileText
                              : ImageIcon;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => onChange({ type: item.value })}
                            className={`rounded-[12px] border p-3 text-left transition ${
                              selected
                                ? "border-[var(--color-afta-red)] bg-red-50"
                                : "border-[var(--color-afta-border)] bg-white hover:border-slate-300"
                            }`}
                          >
                            <Icon className={`h-5 w-5 ${selected ? "text-[var(--color-afta-red)]" : "text-[var(--color-afta-muted)]"}`} />
                            <p className="mt-2 text-sm font-semibold text-[var(--color-afta-text)]">{item.label}</p>
                            <p className="mt-1 text-[10px] leading-relaxed text-[var(--color-afta-muted)]">{item.hint}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div
                    className={`rounded-[14px] border-2 border-dashed px-6 py-10 text-center transition-colors ${
                      dragOver
                        ? "border-[var(--color-afta-red)] bg-red-50/50"
                        : "border-[var(--color-afta-border)] bg-slate-50"
                    }`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                  >
                    {uploading ? (
                      <Loader2 className="mx-auto h-10 w-10 animate-spin text-[var(--color-afta-red)]" />
                    ) : form.url && form.type === "image" ? (
                      <img src={form.url} alt="" className="mx-auto max-h-44 rounded-[8px] object-contain" />
                    ) : form.url ? (
                      <FileText className="mx-auto h-10 w-10 text-[var(--color-afta-red)]" />
                    ) : (
                      <Upload className="mx-auto h-10 w-10 text-[var(--color-afta-subtle)]" />
                    )}
                    <p className="mt-4 text-sm font-semibold text-[var(--color-afta-text)]">
                      {uploading ? "Uploading to Firebase Storage…" : "Drag and drop a file here"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-afta-muted)]">
                      or use the Upload file button above
                    </p>
                    <button
                      type="button"
                      disabled={!canEdit || uploading}
                      className="app-btn-primary mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 text-xs disabled:opacity-60"
                      onClick={openFilePicker}
                    >
                      <Upload className="h-4 w-4" />
                      Upload file
                    </button>
                    <input
                      ref={inputRef}
                      type="file"
                      className="hidden"
                      accept={acceptTypes}
                      disabled={!canEdit || uploading}
                      onChange={(event) => processFile(event.target.files?.[0])}
                    />
                    <p className="mt-4 text-[10px] leading-relaxed text-[var(--color-afta-subtle)]">
                      Compatible with Amazon Signage Stick · secure download URLs · campus playlists
                    </p>
                  </div>

                  {form.fileName || form.storagePath ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--color-afta-border)] bg-white px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-afta-text)]">{form.fileName || "Uploaded file"}</p>
                        <p className="mt-1 text-xs text-[var(--color-afta-muted)]">
                          {formatMediaFileSize(form.fileSize)}
                          {form.mimeType ? ` · ${form.mimeType}` : ""}
                        </p>
                      </div>
                      {canEdit ? (
                        <button
                          type="button"
                          className="app-btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-xs text-red-700"
                          onClick={clearUploadedFile}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {uploadError ? <p className="app-error text-xs">{uploadError}</p> : null}
                </div>
              ) : null}

              {isTextPath || isAnnouncementPath ? (
                <div className="space-y-4">
                  <p className="text-sm text-[var(--color-afta-muted)]">
                    {isAnnouncementPath
                      ? "Create a scrolling or full-screen announcement slide."
                      : "Create a text-only slide for lobby and classroom displays."}
                  </p>
                  <label className="block">
                    <span className="app-label">Slide text</span>
                    <textarea
                      className="app-input min-h-[220px] resize-y"
                      rows={10}
                      value={form.content}
                      onChange={(event) => onChange({ content: event.target.value, type: "announcement" })}
                      placeholder="Enter slide text for campus displays…"
                    />
                  </label>
                </div>
              ) : null}

              {isWebPath || isHtmlPath ? (
                <div className="space-y-4">
                  <p className="text-sm text-[var(--color-afta-muted)]">
                    {isHtmlPath
                      ? "Embed hosted HTML, dashboards, or iframe-friendly web apps. Published Google Sheets links are auto-styled for signage."
                      : "Link to hosted image, video, PDF, or external web content."}
                  </p>
                  <label className="block">
                    <span className="app-label">{isHtmlPath ? "Embed URL" : "Content URL"}</span>
                    <div className="relative">
                      <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-afta-subtle)]" />
                      <input
                        className="app-input pl-9"
                        value={form.url}
                        onChange={(event) => onChange({ url: event.target.value, type: "html" })}
                        placeholder="https://…"
                      />
                    </div>
                  </label>
                  {isHtmlPath ? (
                    <label className="block">
                      <span className="app-label">Fallback caption (optional)</span>
                      <textarea
                        className="app-input min-h-[100px]"
                        rows={4}
                        value={form.content}
                        onChange={(event) => onChange({ content: event.target.value })}
                        placeholder="Shown if the embed cannot load on a display."
                      />
                    </label>
                  ) : null}
                </div>
              ) : null}

              {isBulkPath ? (
                <div className="space-y-5">
                  <p className="text-sm text-[var(--color-afta-muted)]">
                    Upload multiple files at once. Items land in the selected folder and follow your approval workflow.
                  </p>
                  <div
                    className={`rounded-[14px] border-2 border-dashed px-6 py-10 text-center ${
                      dragOver ? "border-[var(--color-afta-red)] bg-red-50/50" : "border-[var(--color-afta-border)] bg-slate-50"
                    }`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragOver(false);
                      processBulkFiles([...(event.dataTransfer.files || [])]);
                    }}
                  >
                    {bulkUploading ? (
                      <Loader2 className="mx-auto h-10 w-10 animate-spin text-[var(--color-afta-red)]" />
                    ) : (
                      <Upload className="mx-auto h-10 w-10 text-[var(--color-afta-subtle)]" />
                    )}
                    <p className="mt-4 text-sm font-semibold text-[var(--color-afta-text)]">
                      {bulkUploading ? "Uploading batch…" : "Drag and drop multiple files"}
                    </p>
                    <button
                      type="button"
                      disabled={!canEdit || bulkUploading || !onSaveBatch}
                      className="app-btn-primary mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 text-xs disabled:opacity-60"
                      onClick={() => bulkInputRef.current?.click()}
                    >
                      Choose files
                    </button>
                    <input
                      ref={bulkInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      accept="image/*,video/*,application/pdf,.ppt,.pptx"
                      onChange={(event) => {
                        const files = [...(event.target.files || [])];
                        event.target.value = "";
                        if (files.length) processBulkFiles(files);
                      }}
                    />
                  </div>
                  {uploadError ? <p className="app-error text-xs">{uploadError}</p> : null}
                </div>
              ) : null}

              {isRssPath ? (
                <div className="space-y-5">
                  <p className="text-sm text-[var(--color-afta-muted)]">
                    Register an RSS feed to import announcements and linked media into your library.
                  </p>
                  <label className="block">
                    <span className="app-label">Feed name</span>
                    <input
                      className="app-input"
                      value={rssForm.name}
                      onChange={(event) => setRssForm({ ...rssForm, name: event.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="app-label">Feed URL</span>
                    <input
                      className="app-input"
                      value={rssForm.feedUrl}
                      onChange={(event) => setRssForm({ ...rssForm, feedUrl: event.target.value })}
                      placeholder="https://…/feed.xml"
                    />
                  </label>
                  {canEdit && onSaveRssFeed ? (
                    <button
                      type="button"
                      className="app-btn-primary px-4 py-2 text-xs"
                      onClick={handleSaveRssFeed}
                    >
                      Save RSS feed
                    </button>
                  ) : null}
                  {rssFeeds.length ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">
                        Existing feeds
                      </p>
                      {rssFeeds.map((feed) => (
                        <div
                          key={feed.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2 text-xs"
                        >
                          <span className="font-semibold text-[var(--color-afta-text)]">{feed.name}</span>
                          {onSyncRssFeed ? (
                            <button
                              type="button"
                              disabled={syncingFeedId === feed.id}
                              className="app-btn-secondary px-2 py-1 text-[10px] disabled:opacity-60"
                              onClick={() => handleSyncRssFeed(feed.id)}
                            >
                              {syncingFeedId === feed.id ? "Syncing…" : "Sync now"}
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {isStockPath ? (
                <div className="space-y-4">
                  <p className="text-sm text-[var(--color-afta-muted)]">
                    Import curated stock photography into your campus library. Credit lines are stored with each asset.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {STOCK_MEDIA_CATALOG.map((asset) => {
                      const selected = selectedStockId === asset.id;
                      return (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => importStockAsset(asset)}
                          className={`overflow-hidden rounded-[12px] border text-left transition ${
                            selected
                              ? "border-[var(--color-afta-red)] ring-2 ring-red-100"
                              : "border-[var(--color-afta-border)] hover:border-slate-300"
                          }`}
                        >
                          <img src={asset.url} alt="" className="aspect-video w-full object-cover" />
                          <div className="p-3">
                            <p className="text-sm font-semibold text-[var(--color-afta-text)]">{asset.title}</p>
                            <p className="mt-1 text-[10px] text-[var(--color-afta-muted)]">{asset.credit}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <aside className="flex flex-col overflow-y-auto border-t border-[var(--color-afta-border)] bg-slate-50 p-4 lg:border-t-0 lg:border-l">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">
              Media information
            </p>
            <div className="mt-3 space-y-3">
              {!isBulkPath && !isRssPath ? (
                <>
              <label className="block">
                <span className="app-label">Name / title</span>
                <input
                  className="app-input"
                  value={form.title}
                  onChange={(event) => onChange({ title: event.target.value })}
                  required
                />
              </label>
              <label className="block">
                <span className="app-label">Description</span>
                <textarea
                  className="app-input min-h-[72px]"
                  rows={3}
                  value={form.description || ""}
                  onChange={(event) => onChange({ description: event.target.value })}
                  placeholder="Internal notes for operators"
                />
              </label>
              <label className="block">
                <span className="app-label">Category</span>
                <select
                  className="app-input"
                  value={form.category || "general"}
                  onChange={(event) => onChange({ category: event.target.value })}
                >
                  {MEDIA_CATEGORIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="app-label">Duration (seconds)</span>
                <input
                  type="number"
                  min="1"
                  className="app-input"
                  value={form.durationSec}
                  onChange={(event) => onChange({ durationSec: event.target.value })}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="app-label">Valid from</span>
                  <input
                    type="date"
                    className="app-input"
                    value={form.validFrom || ""}
                    onChange={(event) => onChange({ validFrom: event.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="app-label">Valid to</span>
                  <input
                    type="date"
                    className="app-input"
                    value={form.validTo || ""}
                    onChange={(event) => onChange({ validTo: event.target.value })}
                  />
                </label>
              </div>
              <label className="block">
                <span className="app-label">Tags (comma-separated)</span>
                <input
                  className="app-input"
                  value={Array.isArray(form.tags) ? form.tags.join(", ") : form.tags || ""}
                  onChange={(event) => onChange({ tags: event.target.value })}
                  placeholder="lobby, training"
                />
              </label>
              <label className="block">
                <span className="app-label">Priority</span>
                <input
                  type="number"
                  min="1"
                  className="app-input"
                  value={form.priority || 1}
                  onChange={(event) => onChange({ priority: event.target.value })}
                />
              </label>
              <label className="block">
                <span className="app-label">Collection / folder</span>
                <select
                  className="app-input"
                  value={form.folderId || ""}
                  onChange={(event) => onChange({ folderId: event.target.value })}
                >
                  <option value="">Uncategorized</option>
                  {mediaFolders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--color-afta-text)]">
                <input
                  type="checkbox"
                  checked={form.active !== false}
                  onChange={(event) => onChange({ active: event.target.checked })}
                />
                Active in library
              </label>
                </>
              ) : isBulkPath ? (
                <label className="block">
                  <span className="app-label">Target folder</span>
                  <select
                    className="app-input"
                    value={form.folderId || ""}
                    onChange={(event) => onChange({ folderId: event.target.value })}
                  >
                    <option value="">Uncategorized</option>
                    {mediaFolders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            <div className="mt-4 rounded-[12px] border border-[var(--color-afta-border)] bg-white p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">Preview</p>
              <div className="mt-2 min-h-[120px]">{renderPreview()}</div>
            </div>
          </aside>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-afta-border)] px-5 py-4">
          <p className="text-xs text-[var(--color-afta-muted)]">
            {form.storagePath ? "Uploaded asset ready" : form.url ? "URL content ready" : form.content ? "Text content ready" : "Add content before saving"}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="app-btn-secondary px-4 py-2 text-xs" onClick={onClose}>
              Cancel
            </button>
            {isFilePath ? (
              <button
                type="button"
                disabled={!canEdit || uploading}
                className="app-btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-xs disabled:opacity-60"
                onClick={openFilePicker}
              >
                <Upload className="h-4 w-4" />
                Upload file
              </button>
            ) : null}
            <button
              type="button"
              disabled={saving || uploading || bulkUploading || !canEdit || isBulkPath || isRssPath}
              className="app-btn-primary px-4 py-2 text-xs disabled:opacity-60"
              onClick={handleSaveClick}
            >
              {form.id ? "Save media" : "Add to library"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
