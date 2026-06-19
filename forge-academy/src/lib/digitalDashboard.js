export const MEDIA_TYPES = [
  { value: "announcement", label: "Announcement" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "pdf", label: "PDF Document" },
  { value: "office", label: "PowerPoint / Office" },
  { value: "html", label: "HTML / Web" },
  { value: "widget", label: "Live Widget" },
  { value: "weather", label: "Weather Ticker" },
];

/** MVIX-style upload categories shown in the media add wizard. */
export const MEDIA_FILE_TYPES = [
  { value: "image", label: "Image", hint: "JPG, PNG, WebP, GIF · 10 MB max" },
  { value: "video", label: "Video", hint: "MP4, WebM, MOV · 100 MB max" },
  { value: "pdf", label: "PDF", hint: "PDF documents · 25 MB max" },
  { value: "office", label: "PowerPoint", hint: "PPT, PPTX, PDF · 25 MB max" },
];

export const MEDIA_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "training", label: "Training" },
  { value: "announcements", label: "Announcements" },
  { value: "dining", label: "Dining" },
  { value: "emergency", label: "Emergency" },
  { value: "executive", label: "Executive" },
];

export const MEDIA_ADD_PATHS = {
  GENERAL_FILE: "general/file",
  GENERAL_TEXT: "general/text",
  GENERAL_ANNOUNCEMENT: "general/announcement",
  WEB_URL: "web/url",
  HTML_EMBED: "html/embed",
  RSS_FEED: "rss/feed",
  STOCK_MEDIA: "stock/browse",
  BULK_UPLOAD: "general/bulk",
};

export const MEDIA_APPROVAL_STATUSES = {
  DRAFT: "draft",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export const MEDIA_APPROVAL_STATUS_LABELS = {
  [MEDIA_APPROVAL_STATUSES.DRAFT]: "Draft",
  [MEDIA_APPROVAL_STATUSES.PENDING]: "Pending review",
  [MEDIA_APPROVAL_STATUSES.APPROVED]: "Approved",
  [MEDIA_APPROVAL_STATUSES.REJECTED]: "Rejected",
};

export const MEDIA_SOURCES = {
  UPLOAD: "upload",
  URL: "url",
  TEXT: "text",
  RSS: "rss",
  STOCK: "stock",
};

export const STOCK_MEDIA_PROVIDERS = [
  { value: "forge", label: "Forge curated" },
  { value: "unsplash", label: "Unsplash" },
  { value: "pexels", label: "Pexels" },
];

/** @param {string} mediaType */
export function mediaAddPathForType(mediaType = "") {
  if (mediaType === "html") return MEDIA_ADD_PATHS.HTML_EMBED;
  if (mediaType === "rss") return MEDIA_ADD_PATHS.RSS_FEED;
  if (mediaType === "stock") return MEDIA_ADD_PATHS.STOCK_MEDIA;
  if (mediaType === "announcement") return MEDIA_ADD_PATHS.GENERAL_ANNOUNCEMENT;
  if (mediaType === "image" || mediaType === "video" || mediaType === "pdf" || mediaType === "office") {
    return MEDIA_ADD_PATHS.GENERAL_FILE;
  }
  if (mediaType === "weather" || mediaType === "widget") return MEDIA_ADD_PATHS.WEB_URL;
  return MEDIA_ADD_PATHS.GENERAL_TEXT;
}

/** @param {string} path */
export function mediaTypeForAddPath(path = "") {
  if (path === MEDIA_ADD_PATHS.GENERAL_FILE || path === MEDIA_ADD_PATHS.BULK_UPLOAD) return "image";
  if (path === MEDIA_ADD_PATHS.GENERAL_ANNOUNCEMENT) return "announcement";
  if (path === MEDIA_ADD_PATHS.HTML_EMBED) return "html";
  if (path === MEDIA_ADD_PATHS.WEB_URL) return "html";
  if (path === MEDIA_ADD_PATHS.RSS_FEED) return "announcement";
  if (path === MEDIA_ADD_PATHS.STOCK_MEDIA) return "image";
  return "announcement";
}

export const DISPLAY_GROUPS = [
  { value: "main_lobby", label: "Main Lobby" },
  { value: "classrooms", label: "Classrooms" },
  { value: "testing_center", label: "Testing Center" },
  { value: "housing", label: "Housing / Dormitory" },
  { value: "dining_hall", label: "Dining Hall" },
  { value: "executive", label: "Executive Offices" },
  { value: "instructor", label: "Instructor Dashboards" },
];

export const DISPLAY_TYPES = [
  { value: "information", label: "Information Display" },
  { value: "training_status", label: "Training Status Board" },
  { value: "classroom", label: "Classroom Display" },
  { value: "testing", label: "Testing Display" },
  { value: "certification", label: "Certification Board" },
  { value: "emergency", label: "Emergency Alert Display" },
  { value: "analytics", label: "Analytics Dashboard" },
];

export const WIDGET_TYPES = [
  { value: "weather", label: "Weather", description: "Regional weather ticker" },
  { value: "clock", label: "Time & Date", description: "Campus clock and calendar" },
  { value: "announcements", label: "Announcements", description: "Rotating academy notices" },
  { value: "emergency", label: "Emergency Alerts", description: "High-priority alert banner" },
  { value: "student_stats", label: "Student Statistics", description: "Enrollment and registration counts" },
  { value: "instructor_dashboard", label: "Instructor Dashboard", description: "Classes and attendance snapshot" },
  { value: "testing_status", label: "Testing Status", description: "Active exams and seat availability" },
  { value: "certification_status", label: "Certification Status", description: "Renewals and pending approvals" },
  { value: "housing_status", label: "Housing Status", description: "Room assignments and check-ins" },
  { value: "lms_progress", label: "LMS Progress", description: "Course completion summary" },
  { value: "dining", label: "Dining Services", description: "Today's meals and weekly menu" },
  { value: "certification_metrics", label: "Certification Metrics", description: "Renewals, expirations, and approvals" },
  { value: "active911", label: "Active911 Incidents", description: "Live incident feed (integration required)" },
  { value: "cad_dashboard", label: "CAD Dashboard", description: "Computer-aided dispatch summary (integration required)" },
  { value: "qr_code", label: "QR Codes", description: "Scannable links for student and visitor flows" },
  { value: "video", label: "Video", description: "Embedded video stream or file" },
  { value: "pdf", label: "PDF", description: "Document viewer widget" },
  { value: "office", label: "PowerPoint", description: "Office presentation widget" },
  { value: "html", label: "Custom HTML", description: "Embedded web content" },
];

export const SCREEN_TEMPLATES = [
  { id: "lobby", label: "Lobby", description: "Hero playlist with ticker and clock" },
  { id: "classroom", label: "Classroom", description: "Training content with schedule sidebar" },
  { id: "testing_center", label: "Testing Center", description: "Exam status and instructions" },
  { id: "executive", label: "Executive", description: "Analytics and certification overview" },
  { id: "housing", label: "Housing", description: "Dormitory notices and housing status" },
  { id: "dining_hall", label: "Dining Hall", description: "Meals, menu, and dietary notices" },
];

export const DIETARY_TAGS = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "gluten_free", label: "Gluten Free" },
  { value: "dairy_free", label: "Dairy Free" },
  { value: "nut_warning", label: "Nut Warning" },
];

export const MEAL_PERIODS = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
];

export const WEEKDAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];

export const DINING_DAY_LABELS = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
};

export const ALERT_MODES = [
  { value: "fullscreen", label: "Full Screen Alert" },
  { value: "scroll", label: "Scrolling Alert" },
];

export const HEARTBEAT_INTERVAL_SECONDS = 60;
export const HEARTBEAT_ONLINE_SECONDS = 90;
export const HEARTBEAT_SYNCING_SECONDS = 300;
/** @deprecated use HEARTBEAT_ONLINE_SECONDS */
export const HEARTBEAT_ONLINE_MINUTES = HEARTBEAT_ONLINE_SECONDS / 60;
/** @deprecated use HEARTBEAT_SYNCING_SECONDS */
export const HEARTBEAT_SYNCING_MINUTES = HEARTBEAT_SYNCING_SECONDS / 60;

export const CONNECTIVITY_STATUSES = [
  { value: "connected", label: "Connected" },
  { value: "degraded", label: "Degraded" },
  { value: "disconnected", label: "Disconnected" },
];

export const REMOTE_DISPLAY_ACTIONS = [
  { value: "refresh", label: "Refresh content" },
  { value: "restart", label: "Restart display" },
  { value: "assign_playlist", label: "Assign playlist" },
  { value: "update_software", label: "Update device" },
];

export const PLAYER_SOFTWARE_VERSION = "1.0.0";

/** Fixed Firestore id for the academy virtual preview player. */
export const VIRTUAL_PLAYER_DISPLAY_ID = "DDX-VIRTUAL";

export const LAYOUT_GRID_COLS = 12;
export const LAYOUT_GRID_ROWS = 6;

export function layoutZoneRowSpan(h = 4) {
  return Math.max(1, Math.min(LAYOUT_GRID_ROWS, Math.round(Number(h) / 2)));
}

export function createLayoutZoneId() {
  return `zone-${Math.random().toString(36).slice(2, 7)}`;
}

/** @param {{ id?: string, widgetType?: string, x?: number, y?: number, w?: number, h?: number }} zone */
export function clampLayoutZone(zone = {}) {
  const x = Math.max(0, Math.min(LAYOUT_GRID_COLS - 1, Number(zone.x) || 0));
  const y = Math.max(0, Math.min(LAYOUT_GRID_ROWS - 1, Number(zone.y) || 0));
  let w = Math.max(1, Math.min(LAYOUT_GRID_COLS - x, Number(zone.w) || 4));
  let h = Math.max(2, Math.min((LAYOUT_GRID_ROWS - y) * 2, Number(zone.h) || 4));
  if (y + layoutZoneRowSpan(h) > LAYOUT_GRID_ROWS) {
    h = Math.max(2, (LAYOUT_GRID_ROWS - y) * 2);
  }
  return {
    id: zone.id || createLayoutZoneId(),
    widgetType: zone.widgetType || "announcements",
    x,
    y,
    w,
    h,
  };
}

export const FORGE_DISPLAYS_PLATFORM_MODULES = [
  { id: "displays", title: "Display Management", status: "done" },
  { id: "player", title: "Display Player Software", status: "done" },
  { id: "provisioning", title: "Device Provisioning", status: "done" },
  { id: "groups", title: "Display Groups", status: "done" },
  { id: "layouts", title: "Layout Designer", status: "done" },
  { id: "widgets", title: "Widget Framework", status: "done" },
  { id: "marketplace", title: "Widget Marketplace", status: "future" },
  { id: "content", title: "Content Management", status: "done" },
  { id: "media", title: "Media Library & Uploads", status: "done" },
  { id: "playlists", title: "Playlist Engine", status: "done" },
  { id: "scheduling", title: "Scheduling Engine", status: "done" },
  { id: "emergency", title: "Emergency Notifications", status: "done" },
  { id: "dining", title: "Dining Services", status: "done" },
  { id: "housing", title: "Housing Operations", status: "partial" },
  { id: "academy", title: "Academy Operations", status: "partial" },
  { id: "testing", title: "Testing Center Displays", status: "partial" },
  { id: "certification", title: "Certification Dashboards", status: "partial" },
  { id: "executive", title: "Executive Dashboards", status: "partial" },
  { id: "analytics", title: "Analytics Engine", status: "done" },
  { id: "qr", title: "QR Code Services", status: "partial" },
  { id: "mobile", title: "Mobile App", status: "future" },
  { id: "active911", title: "Active911 Integration", status: "future" },
  { id: "cad", title: "CAD Integration", status: "future" },
  { id: "multitenant", title: "Multi-Tenant Organizations", status: "future" },
  { id: "offline", title: "Offline Playback", status: "future" },
  { id: "security", title: "Security & Compliance", status: "partial" },
  { id: "api", title: "API Architecture", status: "partial" },
];

export const DISPLAY_STATUSES = [
  { value: "online", label: "Online" },
  { value: "syncing", label: "Syncing" },
  { value: "offline", label: "Offline" },
  { value: "maintenance", label: "Maintenance" },
];

export const TRANSITION_TYPES = [
  { value: "fade", label: "Crossfade" },
  { value: "cut", label: "Cut" },
];

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function createDigitalDashboardId(prefix = "DD") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function formatDurationSeconds(totalSeconds = 0) {
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

export function formatDisplayStatus(status = "") {
  return DISPLAY_STATUSES.find((item) => item.value === status)?.label || status || "Unknown";
}

export function displayStatusTone(status = "") {
  if (status === "online") return "success";
  if (status === "syncing") return "info";
  if (status === "maintenance") return "warning";
  return "critical";
}

export function mediaTypeLabel(type = "") {
  return MEDIA_TYPES.find((item) => item.value === type)?.label || type || "Media";
}

export function computePlaylistDuration(playlist = {}, mediaById = {}) {
  const itemIds = Array.isArray(playlist.itemIds) ? playlist.itemIds : [];
  return itemIds.reduce((total, mediaId) => total + (Number(mediaById[mediaId]?.durationSec) || 0), 0);
}

export function buildMediaLookup(media = []) {
  return Object.fromEntries((media || []).map((item) => [item.id, item]));
}

export function buildPlaylistLookup(playlists = []) {
  return Object.fromEntries((playlists || []).map((item) => [item.id, item]));
}

export function resolveDisplayPlaylist(display = {}, playlistsById = {}) {
  if (!display?.playlistId) return null;
  return playlistsById[display.playlistId] || null;
}

export function summarizeDashboardStats(displays = [], media = [], playlists = [], schedules = []) {
  const physicalDisplays = filterPhysicalDisplays(displays);
  const online = physicalDisplays.filter((item) => item.status === "online").length;
  const activeSchedules = schedules.filter((item) => item.active !== false).length;
  return {
    displayCount: physicalDisplays.length,
    onlineCount: online,
    mediaCount: media.length,
    playlistCount: playlists.length,
    scheduleCount: schedules.length,
    activeScheduleCount: activeSchedules,
  };
}

export function formatLastSync(value = "") {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function defaultDisplayForm(overrides = {}) {
  return {
    id: "",
    name: "",
    assetId: "",
    deviceId: "",
    macAddress: "",
    location: "",
    station: "",
    displayType: "information",
    groupId: "",
    layoutId: "",
    resolution: "1920×1080",
    orientation: "landscape",
    status: "offline",
    connectivityStatus: "disconnected",
    playlistId: "",
    publicKey: "",
    softwareVersion: PLAYER_SOFTWARE_VERSION,
    storageUtilizationPct: 0,
    notes: "",
    lastSyncAt: "",
    lastSeenAt: "",
    heartbeatAt: "",
    pendingRemoteAction: "",
    contentViews: 0,
    isVirtual: false,
    diningMenuId: "",
    ...overrides,
  };
}

export function defaultMediaForm(overrides = {}) {
  return {
    id: "",
    title: "",
    type: "image",
    widgetType: "",
    durationSec: 10,
    content: "",
    description: "",
    category: "general",
    url: "",
    storagePath: "",
    fileName: "",
    fileSize: 0,
    mimeType: "",
    tags: [],
    priority: 1,
    active: true,
    validFrom: "",
    validTo: "",
    folderId: "",
    approvalStatus: MEDIA_APPROVAL_STATUSES.APPROVED,
    approvalNotes: "",
    approvedBy: "",
    approvedAt: "",
    source: MEDIA_SOURCES.UPLOAD,
    rssFeedId: "",
    stockProvider: "",
    stockAssetId: "",
    stockCredit: "",
    impressionCount: 0,
    createdAt: "",
    diningMenuId: "",
    ...overrides,
  };
}

export function defaultMediaFolderForm(overrides = {}) {
  return {
    id: "",
    name: "",
    parentId: "",
    color: "#c8102e",
    description: "",
    ...overrides,
  };
}

export function defaultRssFeedForm(overrides = {}) {
  return {
    id: "",
    name: "",
    feedUrl: "",
    folderId: "",
    active: true,
    syncIntervalMinutes: 60,
    lastSyncedAt: "",
    itemCount: 0,
    ...overrides,
  };
}

export function defaultPlaylistForm(overrides = {}) {
  return {
    id: "",
    name: "",
    description: "",
    itemIds: [],
    loop: true,
    transition: "fade",
    priority: 1,
    ...overrides,
  };
}

export function defaultScheduleForm(overrides = {}) {
  return {
    id: "",
    name: "",
    displayIds: [],
    playlistId: "",
    priority: 1,
    startDate: "",
    endDate: "",
    daysOfWeek: [1, 2, 3, 4, 5],
    startTime: "06:00",
    endTime: "22:00",
    active: true,
    ...overrides,
  };
}

export function filterLibraryRecords(records = [], query = "", fields = []) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return records;
  return records.filter((record) =>
    fields.some((field) => {
      const value = record?.[field];
      if (Array.isArray(value)) {
        return value.some((item) => String(item).toLowerCase().includes(needle));
      }
      return String(value ?? "").toLowerCase().includes(needle);
    }),
  );
}

export function resolveActiveSchedulePlaylist(displayId, schedules = [], playlistsById = {}) {
  const now = new Date();
  const day = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();

  const candidates = schedules
    .filter((schedule) => schedule.active !== false && schedule.displayIds?.includes(displayId))
    .filter((schedule) => {
      if (Array.isArray(schedule.daysOfWeek) && schedule.daysOfWeek.length && !schedule.daysOfWeek.includes(day)) {
        return false;
      }
      const [startH, startM] = String(schedule.startTime || "00:00").split(":").map(Number);
      const [endH, endM] = String(schedule.endTime || "23:59").split(":").map(Number);
      const start = startH * 60 + startM;
      const end = endH * 60 + endM;
      return minutes >= start && minutes <= end;
    })
    .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));

  const winner = candidates[0];
  if (!winner?.playlistId) return null;
  return playlistsById[winner.playlistId] || null;
}

export function buildDisplayPlayerUrl(displayId, publicKey, baseUrl = "", options = {}) {
  const origin = baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const url = `${origin}/display/${displayId}/${publicKey}`;
  if (options.virtual) return `${url}?virtual=1`;
  return url;
}

/** @param {{ id: string, publicKey: string, isVirtual?: boolean }} display */
export function buildVirtualPlayerUrl(display, baseUrl = "") {
  if (!display?.id || !display?.publicKey) return "";
  return buildDisplayPlayerUrl(display.id, display.publicKey, baseUrl, { virtual: true });
}

/** @param {Record<string, unknown> | null | undefined} display */
export function isVirtualDisplay(display) {
  if (!display) return false;
  return Boolean(display.isVirtual) || display.id === VIRTUAL_PLAYER_DISPLAY_ID;
}

/** @param {Record<string, unknown>[]} displays */
export function filterPhysicalDisplays(displays = []) {
  return displays.filter((display) => !isVirtualDisplay(display));
}

export function generatePublicKey() {
  return Math.random().toString(36).slice(2, 10);
}

export function emptyDayMeals() {
  return { breakfast: [], lunch: [], dinner: [] };
}

export function emptyWeekMeals() {
  return Object.fromEntries(WEEKDAY_KEYS.map((day) => [day, emptyDayMeals()]));
}

export function defaultGroupForm(overrides = {}) {
  return {
    id: "",
    name: "",
    groupKey: "main_lobby",
    description: "",
    displayIds: [],
    ...overrides,
  };
}

export function defaultLayoutForm(overrides = {}) {
  return {
    id: "",
    name: "",
    templateId: "lobby",
    zones: [],
    ...overrides,
  };
}

export function defaultAlertForm(overrides = {}) {
  return {
    id: "",
    title: "",
    message: "",
    mode: "fullscreen",
    priority: 10,
    active: false,
    displayIds: [],
    groupIds: [],
    expiresAt: "",
    ...overrides,
  };
}

export function defaultDiningMenuForm(overrides = {}) {
  return {
    id: "",
    name: "",
    weekStartDate: "",
    menuType: "weekly",
    ...emptyWeekMeals(),
    dietaryNotices: [],
    specialEvents: [],
    active: true,
    ...overrides,
  };
}

export function displayGroupLabel(groupKey = "") {
  return DISPLAY_GROUPS.find((item) => item.value === groupKey)?.label || groupKey || "Unassigned";
}

export function displayTypeLabel(displayType = "") {
  return DISPLAY_TYPES.find((item) => item.value === displayType)?.label || displayType || "Information";
}

export function widgetTypeLabel(widgetType = "") {
  return WIDGET_TYPES.find((item) => item.value === widgetType)?.label || widgetType || "Widget";
}

export function computeHeartbeatStatus(lastSyncAt = "", heartbeatAt = "", lastSeenAt = "") {
  const stamp = heartbeatAt || lastSeenAt || lastSyncAt;
  if (!stamp) return "offline";
  const ageSeconds = (Date.now() - new Date(stamp).getTime()) / 1000;
  if (ageSeconds <= HEARTBEAT_ONLINE_SECONDS) return "online";
  if (ageSeconds <= HEARTBEAT_SYNCING_SECONDS) return "syncing";
  return "offline";
}

export function formatConnectivityStatus(status = "") {
  return CONNECTIVITY_STATUSES.find((item) => item.value === status)?.label || status || "Unknown";
}

export function formatStorageUtilization(value = 0) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return `${pct}%`;
}

export function summarizeDeviceHealth(displays = []) {
  const enriched = enrichDisplaysWithHeartbeat(displays);
  return enriched.map((display) => ({
    ...display,
    connectivityLabel: formatConnectivityStatus(display.connectivityStatus),
    storageLabel: formatStorageUtilization(display.storageUtilizationPct),
    lastSeenLabel: formatLastSync(display.lastSeenAt || display.heartbeatAt || display.lastSyncAt),
  }));
}

export function enrichDisplaysWithHeartbeat(displays = []) {
  return displays.map((display) => {
    const heartbeatStatus = computeHeartbeatStatus(display.lastSyncAt, display.heartbeatAt, display.lastSeenAt);
    const connectivityStatus =
      display.connectivityStatus && display.connectivityStatus !== "disconnected"
        ? display.connectivityStatus
        : heartbeatStatus === "online"
          ? "connected"
          : heartbeatStatus === "syncing"
            ? "degraded"
            : "disconnected";
    return {
      ...display,
      heartbeatStatus,
      connectivityStatus,
      status: display.status === "maintenance" ? "maintenance" : heartbeatStatus,
    };
  });
}

export function summarizeExtendedStats(
  displays = [],
  media = [],
  playlists = [],
  schedules = [],
  groups = [],
  layouts = [],
  alerts = [],
  diningMenus = [],
) {
  const base = summarizeDashboardStats(displays, media, playlists, schedules);
  const heartbeatDisplays = enrichDisplaysWithHeartbeat(displays);
  return {
    ...base,
    groupCount: groups.length,
    layoutCount: layouts.length,
    activeAlertCount: alerts.filter((item) => item.active).length,
    diningMenuCount: diningMenus.length,
    activeDiningMenuCount: diningMenus.filter((item) => item.active !== false).length,
    offlineCount: heartbeatDisplays.filter((item) => item.heartbeatStatus === "offline").length,
    widgetCount: media.filter((item) => item.type === "widget" || item.widgetType).length,
  };
}

export function summarizeAnalytics(displays = [], playlists = [], media = [], schedules = []) {
  const physicalDisplays = filterPhysicalDisplays(displays);
  const heartbeatDisplays = enrichDisplaysWithHeartbeat(physicalDisplays);
  const online = heartbeatDisplays.filter((item) => item.heartbeatStatus === "online").length;
  const uptimePercent = physicalDisplays.length ? Math.round((online / physicalDisplays.length) * 100) : 0;
  const playlistUsage = playlists
    .map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
      displayCount: physicalDisplays.filter((display) => display.playlistId === playlist.id).length,
      scheduleCount: schedules.filter((schedule) => schedule.playlistId === playlist.id).length,
    }))
    .sort((a, b) => b.displayCount + b.scheduleCount - (a.displayCount + a.scheduleCount));
  const contentViews = physicalDisplays.reduce((total, display) => total + (Number(display.contentViews) || 0), 0);
  const widgetUsage = WIDGET_TYPES.map((widget) => ({
    ...widget,
    count: media.filter((item) => item.widgetType === widget.value || item.type === widget.value).length,
  })).filter((item) => item.count > 0);

  return {
    uptimePercent,
    onlineCount: online,
    offlineCount: heartbeatDisplays.filter((item) => item.heartbeatStatus === "offline").length,
    contentViews,
    playlistUsage,
    widgetUsage,
  };
}

export function createLayoutFromTemplate(templateId = "lobby") {
  const templates = {
    lobby: [
      { id: "main", widgetType: "announcements", x: 0, y: 0, w: 8, h: 8 },
      { id: "clock", widgetType: "clock", x: 8, y: 0, w: 4, h: 2 },
      { id: "weather", widgetType: "weather", x: 8, y: 2, w: 4, h: 2 },
      { id: "dining", widgetType: "dining", x: 8, y: 4, w: 4, h: 4 },
    ],
    classroom: [
      { id: "main", widgetType: "announcements", x: 0, y: 0, w: 9, h: 8 },
      { id: "testing", widgetType: "testing_status", x: 9, y: 0, w: 3, h: 4 },
      { id: "clock", widgetType: "clock", x: 9, y: 4, w: 3, h: 4 },
    ],
    testing_center: [
      { id: "testing", widgetType: "testing_status", x: 0, y: 0, w: 8, h: 8 },
      { id: "announcements", widgetType: "announcements", x: 8, y: 0, w: 4, h: 4 },
      { id: "clock", widgetType: "clock", x: 8, y: 4, w: 4, h: 4 },
    ],
    executive: [
      { id: "analytics", widgetType: "student_stats", x: 0, y: 0, w: 6, h: 4 },
      { id: "cert", widgetType: "certification_status", x: 6, y: 0, w: 6, h: 4 },
      { id: "announcements", widgetType: "announcements", x: 0, y: 4, w: 12, h: 4 },
    ],
    housing: [
      { id: "housing", widgetType: "housing_status", x: 0, y: 0, w: 8, h: 8 },
      { id: "announcements", widgetType: "announcements", x: 8, y: 0, w: 4, h: 4 },
      { id: "clock", widgetType: "clock", x: 8, y: 4, w: 4, h: 4 },
    ],
    dining_hall: [
      { id: "dining", widgetType: "dining", x: 0, y: 0, w: 8, h: 8 },
      { id: "announcements", widgetType: "announcements", x: 8, y: 0, w: 4, h: 4 },
      { id: "weather", widgetType: "weather", x: 8, y: 4, w: 4, h: 4 },
    ],
  };

  return {
    ...defaultLayoutForm(),
    templateId,
    zones: templates[templateId] || templates.lobby,
  };
}

export function duplicateLayout(layout = {}) {
  return {
    ...layout,
    id: "",
    name: `${layout.name || "Layout"} (Copy)`,
    zones: (layout.zones || []).map((zone) => ({ ...zone, id: `${zone.id}-${Math.random().toString(36).slice(2, 5)}` })),
  };
}

export function createWidgetMedia(widgetType = "announcements", overrides = {}) {
  const widget = WIDGET_TYPES.find((item) => item.value === widgetType);
  return defaultMediaForm({
    title: widget?.label || "Widget",
    type: "widget",
    widgetType,
    content: widget?.description || "",
    durationSec: 15,
    tags: ["widget"],
    ...overrides,
  });
}

/** Widget types surfaced in the playlist quick-add bar. */
export const PLAYLIST_QUICK_WIDGETS = [
  "dining",
  "clock",
  "announcements",
  "weather",
  "testing_status",
  "housing_status",
  "certification_status",
];

/** @param {Record<string, unknown>} menu */
export function serializeMenuForPlayer(menu = {}) {
  const days = Object.fromEntries(
    WEEKDAY_KEYS.map((day) => [day, menu[day] || emptyDayMeals()]),
  );
  return {
    id: menu.id || "",
    name: menu.name || "",
    weekStartDate: menu.weekStartDate || "",
    menuType: menu.menuType || "weekly",
    dietaryNotices: menu.dietaryNotices || [],
    specialEvents: menu.specialEvents || [],
    active: menu.active !== false,
    ...days,
  };
}

function hasDayMeals(dayMeals) {
  return (
    dayMeals &&
    typeof dayMeals === "object" &&
    (Array.isArray(dayMeals.breakfast) ||
      Array.isArray(dayMeals.lunch) ||
      Array.isArray(dayMeals.dinner))
  );
}

function countMenuRecordItems(menu = {}) {
  return WEEKDAY_KEYS.reduce((total, day) => {
    const dayMeals = menu[day];
    if (!dayMeals || typeof dayMeals !== "object") return total;
    return (
      total +
      MEAL_PERIODS.reduce(
        (count, { key }) => count + (Array.isArray(dayMeals[key]) ? dayMeals[key].length : 0),
        0,
      )
    );
  }, 0);
}

function countPopulatedDaysInRecord(menu = {}) {
  return WEEKDAY_KEYS.filter((day) => {
    const dayMeals = menu[day];
    if (!dayMeals || typeof dayMeals !== "object") return false;
    return MEAL_PERIODS.some(({ key }) => Array.isArray(dayMeals[key]) && dayMeals[key].length);
  }).length;
}

function scoreMenuRecord(record = {}) {
  return countMenuRecordItems(record) * 10 + countPopulatedDaysInRecord(record);
}

/** @param {Record<string, unknown>} source */
function pickMenuMetadata(source = {}) {
  return {
    id: source.id,
    name: source.name,
    weekStartDate: source.weekStartDate,
    dietaryNotices: source.dietaryNotices,
    specialEvents: source.specialEvents,
    menuType: source.menuType,
    active: source.active,
  };
}

/** @param {Record<string, unknown>} source */
function menuRecordFromDayFields(source = {}) {
  const record = { ...pickMenuMetadata(source) };
  let hasAny = false;
  for (const day of WEEKDAY_KEYS) {
    const dayMeals = source[day];
    if (!hasDayMeals(dayMeals)) continue;
    record[day] = {
      breakfast: Array.isArray(dayMeals.breakfast) ? dayMeals.breakfast : [],
      lunch: Array.isArray(dayMeals.lunch) ? dayMeals.lunch : [],
      dinner: Array.isArray(dayMeals.dinner) ? dayMeals.dinner : [],
    };
    hasAny = true;
  }
  return hasAny ? record : null;
}

/** @param {Record<string, unknown>} dining */
function menuRecordFromWeekPayload(dining = {}) {
  const record = { ...pickMenuMetadata(dining) };
  for (const day of dining.week || []) {
    if (!day?.key) continue;
    record[day.key] = Object.fromEntries(
      MEAL_PERIODS.map(({ key }) => {
        const meal = (day.meals || []).find((entry) => entry.key === key);
        return [key, Array.isArray(meal?.items) ? meal.items : []];
      }),
    );
  }
  return record;
}

function mergeMenuRecords(records = []) {
  const merged = { ...pickMenuMetadata(records.find(Boolean) || {}) };
  for (const day of WEEKDAY_KEYS) {
    merged[day] = emptyDayMeals();
    for (const record of records) {
      if (!record) continue;
      const dayMeals = record[day];
      if (!dayMeals || typeof dayMeals !== "object") continue;
      for (const { key } of MEAL_PERIODS) {
        const incoming = Array.isArray(dayMeals[key]) ? dayMeals[key] : [];
        const current = merged[day][key] || [];
        if (incoming.length > current.length) {
          merged[day][key] = incoming;
        }
      }
    }
  }
  return merged;
}

/**
 * Resolve dining slide data using live menus, embedded snapshots, and legacy payloads.
 * @param {{
 *   dining?: Record<string, unknown> | null,
 *   menuSnapshot?: Record<string, unknown> | null,
 *   diningMenuId?: string,
 *   menusById?: Record<string, Record<string, unknown>>,
 *   date?: Date,
 * }} options
 */
export function resolveDiningMenuForPlayer({
  dining,
  menuSnapshot,
  diningMenuId = "",
  menusById = {},
  date = new Date(),
} = {}) {
  let liveMenu = diningMenuId ? menusById[diningMenuId] : null;
  if (!liveMenu && Object.keys(menusById).length) {
    liveMenu = resolveActiveDiningMenu(Object.values(menusById), date);
  }
  const liveSnapshot = liveMenu ? serializeMenuForPlayer(liveMenu) : null;
  return normalizeDiningPayload(dining, liveSnapshot || menuSnapshot, date);
}

/**
 * Ensures dining slides always include a full Mon–Fri week for display.
 * Merges live menus, embedded snapshots, and legacy today-only payloads.
 * @param {Record<string, unknown> | null | undefined} dining
 * @param {Record<string, unknown> | null | undefined} [menuSnapshot]
 * @param {Date} [date]
 */
export function normalizeDiningPayload(dining, menuSnapshot, date = new Date()) {
  if (!dining && !menuSnapshot) return null;

  /** @type {{ record: Record<string, unknown>, score: number }[]} */
  const candidates = [];

  const snapshotRecord = menuRecordFromDayFields(menuSnapshot);
  if (snapshotRecord) {
    candidates.push({
      record: snapshotRecord,
      score: scoreMenuRecord(snapshotRecord),
      preferSnapshot: true,
    });
  }

  const diningDayRecord = menuRecordFromDayFields(dining);
  if (diningDayRecord) {
    candidates.push({
      record: diningDayRecord,
      score: scoreMenuRecord(diningDayRecord),
      preferSnapshot: false,
    });
  }

  if (Array.isArray(dining?.week) && dining.week.length === 5) {
    const weekRecord = menuRecordFromWeekPayload(dining);
    candidates.push({
      record: weekRecord,
      score: scoreMenuRecord(weekRecord),
      preferSnapshot: false,
    });
  }

  if (candidates.length) {
    return buildDiningPayload(mergeMenuRecords(candidates.map((entry) => entry.record)), date);
  }

  if (dining?.today) {
    const todayKey = getWeekdayKey(date);
    const legacyMenu = {
      ...pickMenuMetadata(dining),
      ...Object.fromEntries(
        WEEKDAY_KEYS.map((day) => [
          day,
          day === todayKey ? dining.today : emptyDayMeals(),
        ]),
      ),
    };
    return buildDiningPayload(legacyMenu, date);
  }

  return buildDiningPayload(menuSnapshot || dining, date);
}

/** @param {{ id?: string, name?: string, weekStartDate?: string }} menu */
export function createDiningMenuMedia(menu = {}) {
  return createWidgetMedia("dining", {
    title: menu.name ? `${menu.name} — Dining Menu` : "Dining Menu",
    diningMenuId: menu.id || "",
    diningMenuSnapshot: serializeMenuForPlayer(menu),
    category: "dining",
    content: menu.weekStartDate
      ? `Weekly dining menu · Week of ${menu.weekStartDate}`
      : "Weekly dining menu",
    durationSec: 45,
    tags: ["widget", "dining"],
  });
}

/** @param {Record<string, unknown>[]} menus @param {string} [menuId] @param {Date} [date] */
export function resolveDiningMenu(menus = [], menuId = "", date = new Date()) {
  if (menuId) {
    const match = menus.find((menu) => menu.id === menuId && menu.active !== false);
    if (match) return match;
  }
  return resolveActiveDiningMenu(menus, date);
}

/** @param {Record<string, unknown> | null} menu @param {Date} [date] */
export function buildDiningPayload(menu, date = new Date()) {
  if (!menu) return null;
  const dayKey = getWeekdayKey(date);
  const week = buildDiningWeekDays(menu, date);
  const base = {
    id: menu.id,
    name: menu.name,
    weekStartDate: menu.weekStartDate || "",
    week,
    dietaryNotices: menu.dietaryNotices || [],
    specialEvents: menu.specialEvents || [],
  };

  if (!dayKey) {
    return {
      ...base,
      today: { breakfast: [], lunch: [], dinner: [] },
      nextMeal: null,
      weekend: true,
    };
  }

  const today = menu[dayKey] || { breakfast: [], lunch: [], dinner: [] };
  const nextMeal = getNextMealPeriod(menu, date);
  return {
    ...base,
    today,
    nextMeal: nextMeal || { period: "today", items: today.lunch || [] },
    weekend: false,
  };
}

/** @param {Record<string, unknown>} menu @param {Date} [date] */
export function buildDiningWeekDays(menu = {}, date = new Date()) {
  const todayKey = getWeekdayKey(date);
  return WEEKDAY_KEYS.map((day) => ({
    key: day,
    label: DINING_DAY_LABELS[day],
    isToday: day === todayKey,
    meals: MEAL_PERIODS.map(({ key, label }) => ({
      key,
      label,
      items: Array.isArray(menu[day]?.[key]) ? menu[day][key] : [],
    })),
  }));
}

/** @param {string} weekStartDate */
export function formatDiningWeekLabel(weekStartDate = "") {
  if (!weekStartDate) return "";
  const parsed = new Date(`${weekStartDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return weekStartDate;
  return parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** @param {Record<string, unknown>} item @param {Record<string, Record<string, unknown>>} [menusById] */
export function describePlaylistMediaItem(item, menusById = {}) {
  if (!item) return "Unknown item";
  if (item.widgetType === "dining") {
    const menu = menusById[item.diningMenuId];
    return menu ? `Dining · ${menu.name}` : "Dining menu slide";
  }
  if (item.type === "widget" && item.widgetType) {
    const widget = WIDGET_TYPES.find((entry) => entry.value === item.widgetType);
    return widget?.label || item.widgetType;
  }
  const mediaType = MEDIA_TYPES.find((entry) => entry.value === item.type);
  return mediaType?.label || item.type || "Media";
}

export function resolveActiveEmergencyAlert(display = {}, alerts = [], groups = []) {
  const now = Date.now();
  const groupIds = groups
    .filter((group) => (group.displayIds || []).includes(display.id))
    .map((group) => group.id);

  return alerts
    .filter((alert) => alert.active)
    .filter((alert) => !alert.expiresAt || new Date(alert.expiresAt).getTime() > now)
    .filter(
      (alert) =>
        (alert.displayIds || []).includes(display.id) ||
        (alert.groupIds || []).some((groupId) => groupIds.includes(groupId)) ||
        (!(alert.displayIds || []).length && !(alert.groupIds || []).length),
    )
    .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0))[0] || null;
}

export function getWeekdayKey(date = new Date()) {
  const day = date.getDay();
  if (day === 0 || day === 6) return null;
  return WEEKDAY_KEYS[day - 1] || null;
}

export function resolveActiveDiningMenu(menus = [], date = new Date()) {
  const activeMenus = menus.filter((menu) => menu.active !== false);
  if (!activeMenus.length) return null;
  const target = date.toISOString().slice(0, 10);
  const dated = activeMenus.find((menu) => menu.weekStartDate && menu.weekStartDate <= target);
  return dated || activeMenus[0];
}

export function getTodayMeals(menu = {}, date = new Date()) {
  const dayKey = getWeekdayKey(date);
  if (!dayKey) return emptyDayMeals();
  return menu?.[dayKey] || emptyDayMeals();
}

export function getNextMealPeriod(menu = {}, date = new Date()) {
  const meals = getTodayMeals(menu, date);
  const hour = date.getHours();
  if (hour < 10 && meals.breakfast?.length) return { period: "breakfast", items: meals.breakfast };
  if (hour < 15 && meals.lunch?.length) return { period: "lunch", items: meals.lunch };
  if (meals.dinner?.length) return { period: "dinner", items: meals.dinner };
  return null;
}

export function formatMealItems(items = []) {
  return (items || []).map((item) => String(item)).filter(Boolean);
}

/** Split pasted menu text into line items (supports Excel/Word newlines and tabs). */
export function parseMenuText(text = "") {
  return String(text)
    .replace(/\r\n/g, "\n")
    .split(/\n|\t|;/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function mealItemsToText(items = []) {
  return formatMealItems(items).join("\n");
}

export function isDiningMenuDay(date = new Date()) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}
