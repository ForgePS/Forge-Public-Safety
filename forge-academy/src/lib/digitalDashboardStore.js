import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase.js";
import {
  createDigitalDashboardId,
  createDiningMenuMedia,
  createLayoutFromTemplate,
  defaultDisplayForm,
  defaultDiningMenuForm,
  emptyWeekMeals,
  generatePublicKey,
  MEDIA_APPROVAL_STATUSES,
  VIRTUAL_PLAYER_DISPLAY_ID,
} from "./digitalDashboard.js";
import { deleteDigitalDashboardMediaFile } from "./digitalDashboardMediaStorage.js";

const mediaRef = collection(db, "digitalDashboardMedia");
const playlistsRef = collection(db, "digitalDashboardPlaylists");
const displaysRef = collection(db, "digitalDashboardDisplays");
const schedulesRef = collection(db, "digitalDashboardSchedules");
const groupsRef = collection(db, "digitalDashboardGroups");
const layoutsRef = collection(db, "digitalDashboardLayouts");
const alertsRef = collection(db, "digitalDashboardAlerts");
const diningMenusRef = collection(db, "digitalDashboardDiningMenus");
const mediaFoldersRef = collection(db, "digitalDashboardMediaFolders");
const rssFeedsRef = collection(db, "digitalDashboardRssFeeds");

function mapDoc(item) {
  return { id: item.id, ...item.data() };
}

export async function listDigitalDashboardMedia() {
  const snap = await getDocs(mediaRef);
  return snap.docs.map(mapDoc).sort((a, b) => (a.title || "").localeCompare(b.title || ""));
}

export async function listDigitalDashboardPlaylists() {
  const snap = await getDocs(playlistsRef);
  return snap.docs.map(mapDoc);
}

export async function listDigitalDashboardDisplays() {
  const snap = await getDocs(displaysRef);
  return snap.docs.map(mapDoc);
}

export async function listDigitalDashboardSchedules() {
  const snap = await getDocs(schedulesRef);
  return snap.docs.map(mapDoc);
}

export async function listDigitalDashboardGroups() {
  const snap = await getDocs(groupsRef);
  return snap.docs.map(mapDoc);
}

export async function listDigitalDashboardLayouts() {
  const snap = await getDocs(layoutsRef);
  return snap.docs.map(mapDoc);
}

export async function listDigitalDashboardAlerts() {
  const snap = await getDocs(alertsRef);
  return snap.docs.map(mapDoc);
}

export async function listDigitalDashboardDiningMenus() {
  const snap = await getDocs(diningMenusRef);
  return snap.docs.map(mapDoc);
}

export async function listDigitalDashboardMediaFolders() {
  const snap = await getDocs(mediaFoldersRef);
  return snap.docs.map(mapDoc).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

export async function listDigitalDashboardRssFeeds() {
  const snap = await getDocs(rssFeedsRef);
  return snap.docs.map(mapDoc).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

export async function loadDigitalDashboardBundle() {
  const [media, playlists, displays, schedules, groups, layouts, alerts, diningMenus, mediaFolders, rssFeeds] =
    await Promise.all([
    listDigitalDashboardMedia(),
    listDigitalDashboardPlaylists(),
    listDigitalDashboardDisplays(),
    listDigitalDashboardSchedules(),
    listDigitalDashboardGroups(),
    listDigitalDashboardLayouts(),
    listDigitalDashboardAlerts(),
    listDigitalDashboardDiningMenus(),
    listDigitalDashboardMediaFolders(),
    listDigitalDashboardRssFeeds(),
  ]);
  return { media, playlists, displays, schedules, groups, layouts, alerts, diningMenus, mediaFolders, rssFeeds };
}

/** @param {Record<string, unknown>} record */
export async function saveDigitalDashboardMedia(record) {
  const id = record.id || createDigitalDashboardId("DDM");
  await setDoc(
    doc(db, "digitalDashboardMedia", id),
    {
      ...record,
      id,
      durationSec: Number(record.durationSec) || 10,
      priority: Number(record.priority) || 1,
      fileSize: Number(record.fileSize) || 0,
      impressionCount: Number(record.impressionCount) || 0,
      active: record.active !== false,
      approvalStatus: record.approvalStatus || MEDIA_APPROVAL_STATUSES.APPROVED,
      tags: Array.isArray(record.tags) ? record.tags : [],
      updatedAt: serverTimestamp(),
      createdAt: record.createdAt || serverTimestamp(),
    },
    { merge: true },
  );
  return id;
}

/** @param {Record<string, unknown>[]} records */
export async function saveDigitalDashboardMediaBatch(records = []) {
  const batch = writeBatch(db);
  const ids = [];
  for (const record of records) {
    const id = record.id || createDigitalDashboardId("DDM");
    ids.push(id);
    batch.set(
      doc(db, "digitalDashboardMedia", id),
      {
        ...record,
        id,
        durationSec: Number(record.durationSec) || 10,
        priority: Number(record.priority) || 1,
        fileSize: Number(record.fileSize) || 0,
        impressionCount: Number(record.impressionCount) || 0,
        active: record.active !== false,
        approvalStatus: record.approvalStatus || MEDIA_APPROVAL_STATUSES.APPROVED,
        tags: Array.isArray(record.tags) ? record.tags : [],
        updatedAt: serverTimestamp(),
        createdAt: record.createdAt || serverTimestamp(),
      },
      { merge: true },
    );
  }
  await batch.commit();
  return ids;
}

/**
 * @param {string} mediaId
 * @param {string} status
 * @param {{ notes?: string, userId?: string }} [meta]
 */
export async function updateDigitalDashboardMediaApproval(mediaId, status, meta = {}) {
  await setDoc(
    doc(db, "digitalDashboardMedia", mediaId),
    {
      approvalStatus: status,
      approvalNotes: meta.notes ?? "",
      approvedBy: status === MEDIA_APPROVAL_STATUSES.APPROVED ? meta.userId ?? "" : "",
      approvedAt: status === MEDIA_APPROVAL_STATUSES.APPROVED ? new Date().toISOString() : "",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/** @param {Record<string, unknown>} record */
export async function saveDigitalDashboardMediaFolder(record) {
  const id = record.id || createDigitalDashboardId("DDF");
  await setDoc(
    doc(db, "digitalDashboardMediaFolders", id),
    {
      ...record,
      id,
      updatedAt: serverTimestamp(),
      createdAt: record.createdAt || serverTimestamp(),
    },
    { merge: true },
  );
  return id;
}

/** @param {string} feedId */
export async function syncDigitalDashboardRssFeed(feedId) {
  const callable = httpsCallable(functions, "syncDigitalDashboardRssFeedCallable");
  const result = await callable({ feedId });
  return result.data;
}

export async function saveDigitalDashboardRssFeed(record) {
  const id = record.id || createDigitalDashboardId("DDR");
  await setDoc(
    doc(db, "digitalDashboardRssFeeds", id),
    {
      ...record,
      id,
      syncIntervalMinutes: Number(record.syncIntervalMinutes) || 60,
      active: record.active !== false,
      updatedAt: serverTimestamp(),
      createdAt: record.createdAt || serverTimestamp(),
    },
    { merge: true },
  );
  return id;
}

/** @param {Record<string, unknown>} record */
export async function saveDigitalDashboardPlaylist(record) {
  const id = record.id || createDigitalDashboardId("DDP");
  await setDoc(
    doc(db, "digitalDashboardPlaylists", id),
    {
      ...record,
      id,
      itemIds: Array.isArray(record.itemIds) ? record.itemIds : [],
      priority: Number(record.priority) || 1,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return id;
}

/** @param {{ id: string, name?: string, weekStartDate?: string }} menu */
export async function ensureDiningMenuMedia(menu) {
  if (!menu?.id) throw new Error("Menu id is required.");
  const media = await listDigitalDashboardMedia();
  const existing = media.find((item) => item.widgetType === "dining" && item.diningMenuId === menu.id);
  const payload = createDiningMenuMedia(menu);
  if (existing) {
    await saveDigitalDashboardMedia({ ...existing, ...payload, id: existing.id });
    return existing.id;
  }
  return saveDigitalDashboardMedia(payload);
}

/**
 * @param {{ id: string, name?: string, weekStartDate?: string }} menu
 * @param {string} playlistId
 */
export async function addDiningMenuToPlaylist(menu, playlistId) {
  if (!playlistId) throw new Error("Playlist id is required.");
  const mediaId = await ensureDiningMenuMedia(menu);
  const snap = await getDoc(doc(db, "digitalDashboardPlaylists", playlistId));
  if (!snap.exists()) throw new Error("Playlist not found.");
  const playlist = snap.data();
  const itemIds = Array.isArray(playlist.itemIds) ? [...playlist.itemIds] : [];
  if (!itemIds.includes(mediaId)) itemIds.push(mediaId);
  await saveDigitalDashboardPlaylist({ ...playlist, id: playlistId, itemIds });
  return mediaId;
}

/** @param {Record<string, unknown>} record */
export async function saveDigitalDashboardDisplay(record) {
  const id = record.id || createDigitalDashboardId("DDX");
  const publicKey = record.publicKey || generatePublicKey();
  await setDoc(
    doc(db, "digitalDashboardDisplays", id),
    {
      ...record,
      id,
      publicKey,
      contentViews: Number(record.contentViews) || 0,
      storageUtilizationPct: Math.max(0, Math.min(100, Number(record.storageUtilizationPct) || 0)),
      softwareVersion: record.softwareVersion || "1.0.0",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return { id, publicKey };
}

/** Ensures the academy virtual preview player display exists. */
export async function ensureVirtualPlayerDisplay() {
  const ref = doc(db, "digitalDashboardDisplays", VIRTUAL_PLAYER_DISPLAY_ID);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() };
  }

  const publicKey = generatePublicKey();
  const record = defaultDisplayForm({
    id: VIRTUAL_PLAYER_DISPLAY_ID,
    name: "Virtual Player",
    isVirtual: true,
    deviceId: "virtual-player",
    location: "Virtual · Admin preview",
    station: "Virtual",
    notes: "Browser-based virtual player for content preview. Does not count as a physical campus device.",
    status: "offline",
    connectivityStatus: "disconnected",
    publicKey,
  });

  await setDoc(ref, {
    ...record,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return record;
}

async function queueRemoteAction(displayId, action, extra = {}) {
  await setDoc(
    doc(db, "digitalDashboardDisplays", displayId),
    {
      pendingRemoteAction: action,
      ...extra,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function remoteRefreshDisplay(displayId) {
  await queueRemoteAction(displayId, "refresh");
}

export async function remoteRestartDisplay(displayId) {
  await queueRemoteAction(displayId, "restart", { status: "syncing" });
}

export async function remoteAssignDisplayPlaylist(displayId, playlistId) {
  await queueRemoteAction(displayId, "refresh", { playlistId });
}

export async function remoteUpdateDisplaySoftware(displayId, softwareVersion = "1.0.0") {
  await queueRemoteAction(displayId, "update_software", { softwareVersion });
}

/** @param {Record<string, unknown>} record */
export async function saveDigitalDashboardSchedule(record) {
  const id = record.id || createDigitalDashboardId("DDS");
  await setDoc(
    doc(db, "digitalDashboardSchedules", id),
    {
      ...record,
      id,
      displayIds: Array.isArray(record.displayIds) ? record.displayIds : [],
      daysOfWeek: Array.isArray(record.daysOfWeek) ? record.daysOfWeek : [],
      priority: Number(record.priority) || 1,
      active: record.active !== false,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return id;
}

/** @param {Record<string, unknown>} record */
export async function saveDigitalDashboardGroup(record) {
  const id = record.id || createDigitalDashboardId("DDG");
  await setDoc(
    doc(db, "digitalDashboardGroups", id),
    {
      ...record,
      id,
      displayIds: Array.isArray(record.displayIds) ? record.displayIds : [],
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return id;
}

/** @param {Record<string, unknown>} record */
export async function saveDigitalDashboardLayout(record) {
  const id = record.id || createDigitalDashboardId("DDL");
  await setDoc(
    doc(db, "digitalDashboardLayouts", id),
    {
      ...record,
      id,
      zones: Array.isArray(record.zones) ? record.zones : [],
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return id;
}

/** @param {Record<string, unknown>} record */
export async function saveDigitalDashboardAlert(record) {
  const id = record.id || createDigitalDashboardId("DDA");
  await setDoc(
    doc(db, "digitalDashboardAlerts", id),
    {
      ...record,
      id,
      displayIds: Array.isArray(record.displayIds) ? record.displayIds : [],
      groupIds: Array.isArray(record.groupIds) ? record.groupIds : [],
      priority: Number(record.priority) || 10,
      active: record.active === true,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return id;
}

/** @param {Record<string, unknown>} record */
export async function saveDigitalDashboardDiningMenu(record) {
  const id = record.id || createDigitalDashboardId("DDN");
  const week = emptyWeekMeals();
  for (const day of Object.keys(week)) {
    week[day] = record[day] || week[day];
  }
  await setDoc(
    doc(db, "digitalDashboardDiningMenus", id),
    {
      ...record,
      ...week,
      id,
      active: record.active !== false,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await ensureDiningMenuMedia({ ...record, ...week, id });
  return id;
}

export async function deleteDigitalDashboardRecord(collectionName, id, options = {}) {
  if (collectionName === "digitalDashboardMedia" && options.storagePath) {
    await deleteDigitalDashboardMediaFile(options.storagePath);
  }
  await deleteDoc(doc(db, collectionName, id));
}

const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
const weekStart = () => {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
};

export async function seedAcademyDigitalDashboard() {
  const media = [
    {
      id: "DDM-WELCOME",
      title: "Welcome to AFTA",
      type: "announcement",
      durationSec: 20,
      content: "Arkansas Fire Training Academy — Forge Academy digital signage.",
      tags: ["lobby"],
      priority: 1,
      createdAt: hoursAgo(72),
    },
    {
      id: "DDM-CLASSES",
      title: "Upcoming Classes",
      type: "announcement",
      durationSec: 25,
      content: "View open class sessions and register through the student portal.",
      tags: ["training"],
      priority: 2,
      createdAt: hoursAgo(48),
    },
    {
      id: "DDM-REG",
      title: "Registration Reminder",
      type: "announcement",
      durationSec: 18,
      content: "Department approvals are required before academy enrollment closes.",
      tags: ["registration"],
      priority: 2,
      createdAt: hoursAgo(36),
    },
    {
      id: "DDM-WEATHER",
      title: "Campus Weather",
      type: "weather",
      durationSec: 12,
      content: "Check local conditions before travel to on-campus sessions.",
      tags: ["ticker"],
      priority: 1,
      createdAt: hoursAgo(2),
    },
    {
      id: "DDM-SAFETY",
      title: "Training Safety",
      type: "announcement",
      durationSec: 15,
      content: "PPE required for all live-fire and skills evaluation sessions.",
      tags: ["safety"],
      priority: 3,
      createdAt: hoursAgo(24),
    },
    {
      id: "DDM-WIDGET-DINING",
      title: "Dining Services Widget",
      type: "widget",
      widgetType: "dining",
      diningMenuId: "DDN-WEEKLY",
      durationSec: 20,
      content: "Today's meals and weekly menu from academy dining services.",
      tags: ["widget", "dining"],
      category: "dining",
      priority: 1,
      createdAt: hoursAgo(12),
    },
    {
      id: "DDM-WIDGET-TESTING",
      title: "Testing Status Widget",
      type: "widget",
      widgetType: "testing_status",
      durationSec: 20,
      content: "Active exam windows and seat availability.",
      tags: ["widget", "testing"],
      priority: 2,
      createdAt: hoursAgo(12),
    },
  ];

  const playlists = [
    {
      id: "DDP-LOBBY",
      name: "Campus Lobby Loop",
      description: "Visitor and student lobby rotation.",
      itemIds: ["DDM-WELCOME", "DDM-CLASSES", "DDM-WEATHER", "DDM-REG"],
      loop: true,
      transition: "fade",
      priority: 1,
    },
    {
      id: "DDP-TRAIN",
      name: "Training Floor",
      description: "Skills labs and classroom displays.",
      itemIds: ["DDM-CLASSES", "DDM-SAFETY", "DDM-WELCOME"],
      loop: true,
      transition: "cut",
      priority: 2,
    },
    {
      id: "DDP-DINING",
      name: "Dining Hall Loop",
      description: "Meals, announcements, and campus weather.",
      itemIds: ["DDM-WIDGET-DINING", "DDM-WELCOME", "DDM-WEATHER"],
      loop: true,
      transition: "fade",
      priority: 3,
    },
  ];

  const layouts = [
    {
      id: "DDL-LOBBY",
      ...createLayoutFromTemplate("lobby"),
      name: "Main Lobby Board",
    },
    {
      id: "DDL-DINING",
      ...createLayoutFromTemplate("dining_hall"),
      name: "Dining Hall Board",
    },
  ];

  const displays = [
    {
      id: "DDX-MAIN-LOBBY",
      name: "Main Campus — Lobby",
      assetId: "AFTA-TV-001",
      deviceId: "forge-player-lobby-01",
      macAddress: "00:1A:2B:3C:4D:01",
      location: "Front entrance",
      station: "Camden Campus",
      displayType: "information",
      groupId: "DDG-LOBBY",
      layoutId: "DDL-LOBBY",
      resolution: "1920×1080",
      orientation: "landscape",
      status: "online",
      connectivityStatus: "connected",
      playlistId: "DDP-LOBBY",
      publicKey: generatePublicKey(),
      softwareVersion: "1.0.0",
      storageUtilizationPct: 34,
      notes: "Wall-mounted 55″ display",
      lastSyncAt: hoursAgo(0.2),
      lastSeenAt: hoursAgo(0.02),
      heartbeatAt: hoursAgo(0.02),
      contentViews: 128,
    },
    {
      id: "DDX-TRAIN-ROOM",
      name: "Training Building — Classroom",
      assetId: "AFTA-TV-014",
      deviceId: "forge-player-class-14",
      macAddress: "00:1A:2B:3C:4D:14",
      location: "Skills lab hallway",
      station: "Camden Campus",
      displayType: "classroom",
      groupId: "DDG-CLASSROOMS",
      layoutId: "",
      resolution: "1920×1080",
      orientation: "landscape",
      status: "syncing",
      connectivityStatus: "degraded",
      playlistId: "DDP-TRAIN",
      publicKey: generatePublicKey(),
      softwareVersion: "1.0.0",
      storageUtilizationPct: 61,
      notes: "",
      lastSyncAt: hoursAgo(1),
      lastSeenAt: hoursAgo(0.8),
      heartbeatAt: hoursAgo(0.8),
      contentViews: 42,
    },
    {
      id: "DDX-DINING",
      name: "Dining Hall — Menu Board",
      assetId: "AFTA-TV-022",
      deviceId: "forge-player-dining-22",
      macAddress: "00:1A:2B:3C:4D:22",
      location: "Dining hall entrance",
      station: "Camden Campus",
      displayType: "information",
      groupId: "DDG-DINING",
      layoutId: "",
      resolution: "1920×1080",
      orientation: "landscape",
      status: "online",
      connectivityStatus: "connected",
      playlistId: "DDP-DINING",
      diningMenuId: "DDN-WEEKLY",
      publicKey: generatePublicKey(),
      softwareVersion: "1.0.0",
      storageUtilizationPct: 28,
      notes: "Shows weekly menu and dietary notices",
      lastSyncAt: hoursAgo(0.1),
      lastSeenAt: hoursAgo(0.01),
      heartbeatAt: hoursAgo(0.01),
      contentViews: 86,
    },
  ];

  const groups = [
    {
      id: "DDG-LOBBY",
      name: "Main Lobby",
      groupKey: "main_lobby",
      description: "Visitor and student lobby screens",
      displayIds: ["DDX-MAIN-LOBBY"],
    },
    {
      id: "DDG-CLASSROOMS",
      name: "Classrooms",
      groupKey: "classrooms",
      description: "Training rooms and skills labs",
      displayIds: ["DDX-TRAIN-ROOM"],
    },
    {
      id: "DDG-DINING",
      name: "Dining Hall",
      groupKey: "dining_hall",
      description: "Dining hall and meal service displays",
      displayIds: ["DDX-DINING"],
    },
    {
      id: "DDG-TESTING",
      name: "Testing Center",
      groupKey: "testing_center",
      description: "Exam rooms and proctor stations",
      displayIds: [],
    },
    {
      id: "DDG-HOUSING",
      name: "Housing / Dormitory",
      groupKey: "housing",
      description: "Residence hall information boards",
      displayIds: [],
    },
  ];

  const schedules = [
    {
      id: "DDS-WEEKDAY",
      name: "Weekday Campus Hours",
      displayIds: ["DDX-MAIN-LOBBY", "DDX-TRAIN-ROOM"],
      playlistId: "DDP-LOBBY",
      priority: 2,
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: "06:00",
      endTime: "22:00",
      active: true,
    },
    {
      id: "DDS-DINING",
      name: "Dining Service Hours",
      displayIds: ["DDX-DINING"],
      playlistId: "DDP-DINING",
      priority: 3,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startTime: "06:30",
      endTime: "20:00",
      active: true,
    },
  ];

  const diningMenu = {
    id: "DDN-WEEKLY",
    name: "Weekly Campus Menu",
    weekStartDate: weekStart(),
    menuType: "weekly",
    ...defaultDiningMenuForm(),
    monday: {
      breakfast: ["Scrambled eggs", "Oatmeal [Vegetarian]", "Fresh fruit"],
      lunch: ["Grilled chicken", "Vegetable soup [Vegetarian]", "House salad"],
      dinner: ["Meatloaf", "Pasta primavera [Vegetarian]", "Green beans"],
    },
    tuesday: {
      breakfast: ["Pancakes", "Yogurt parfait [Vegetarian]", "Banana"],
      lunch: ["Turkey wraps", "Black bean chili [Vegan]", "Coleslaw"],
      dinner: ["Baked fish", "Rice pilaf", "Steamed broccoli"],
    },
    wednesday: {
      breakfast: ["Breakfast burrito", "Granola [Vegetarian]", "Orange slices"],
      lunch: ["BBQ pulled pork", "Garden burger [Vegetarian]", "Cornbread"],
      dinner: ["Roast beef", "Mac and cheese", "Mixed vegetables"],
    },
    thursday: {
      breakfast: ["French toast", "Hard-boiled eggs", "Apples"],
      lunch: ["Chicken tenders", "Caesar salad", "Tomato soup [Vegetarian]"],
      dinner: ["Spaghetti", "Marinara [Vegetarian]", "Garlic bread"],
    },
    friday: {
      breakfast: ["Biscuits and gravy", "Cereal bar [Vegetarian]", "Melon cup"],
      lunch: ["Fish tacos", "Quinoa bowl [Vegan]", "Chips and salsa"],
      dinner: ["Pizza night", "Cheese pizza [Vegetarian]", "Caesar salad"],
    },
    dietaryNotices: ["Nut Warning: Peanut butter available at breakfast bar on Wednesdays."],
    specialEvents: ["Firefighter appreciation cookout — Friday lunch"],
    active: true,
  };

  const alerts = [
    {
      id: "DDA-SAMPLE",
      title: "Sample Weather Advisory",
      message: "Heat advisory in effect until 7 PM. Hydrate before outdoor training evolutions.",
      mode: "scroll",
      priority: 5,
      active: false,
      displayIds: [],
      groupIds: ["DDG-LOBBY", "DDG-CLASSROOMS"],
      expiresAt: "",
    },
  ];

  const batch = writeBatch(db);
  for (const row of media) batch.set(doc(db, "digitalDashboardMedia", row.id), row);
  for (const row of playlists) batch.set(doc(db, "digitalDashboardPlaylists", row.id), row);
  for (const row of displays) batch.set(doc(db, "digitalDashboardDisplays", row.id), row);
  for (const row of schedules) batch.set(doc(db, "digitalDashboardSchedules", row.id), row);
  for (const row of groups) batch.set(doc(db, "digitalDashboardGroups", row.id), row);
  for (const row of layouts) batch.set(doc(db, "digitalDashboardLayouts", row.id), row);
  batch.set(doc(db, "digitalDashboardDiningMenus", diningMenu.id), diningMenu);
  for (const row of alerts) batch.set(doc(db, "digitalDashboardAlerts", row.id), row);
  await batch.commit();

  return {
    media: media.length,
    playlists: playlists.length,
    displays: displays.length,
    schedules: schedules.length,
    groups: groups.length,
    layouts: layouts.length,
    diningMenus: 1,
    alerts: alerts.length,
  };
}
