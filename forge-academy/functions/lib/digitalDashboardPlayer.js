import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { incrementMediaImpressions } from "./digitalDashboardRss.js";

const db = () => getFirestore();

const MEDIA_APPROVAL_STATUSES = {
  APPROVED: "approved",
};

function isMediaPublishable(item, approvalRequired = false) {
  if (!item || item.active === false) return false;
  const status = item.approvalStatus || MEDIA_APPROVAL_STATUSES.APPROVED;
  if (approvalRequired && status !== MEDIA_APPROVAL_STATUSES.APPROVED) return false;
  const today = new Date().toISOString().slice(0, 10);
  if (item.validFrom && item.validFrom > today) return false;
  if (item.validTo && item.validTo < today) return false;
  if (item.type === "widget" && item.widgetType) return true;
  return Boolean(item.url || item.content);
}

async function isPublicPlayerEnabled() {
  const snap = await db().doc("systemSettings/default").get();
  if (!snap.exists) return true;
  const settings = snap.data()?.digitalDashboard ?? {};
  if (settings.moduleEnabled === false) return false;
  return settings.allowPublicPlayer !== false;
}

async function isVirtualPlayerEnabled() {
  const snap = await db().doc("systemSettings/default").get();
  if (!snap.exists) return true;
  return snap.data()?.digitalDashboard?.virtualPlayerEnabled !== false;
}

async function getPlayerConfig() {
  const snap = await db().doc("systemSettings/default").get();
  const settings = snap.exists ? snap.data()?.digitalDashboard ?? {} : {};
  const heartbeat = Number(settings.heartbeatIntervalSeconds);
  const fromMinutes = Number(settings.playerRefreshMinutes) * 60;
  const refreshIntervalSeconds =
    Number.isFinite(heartbeat) && heartbeat > 0
      ? heartbeat
      : Number.isFinite(fromMinutes) && fromMinutes > 0
        ? fromMinutes
        : 60;
  return {
    refreshIntervalSeconds: Math.max(15, refreshIntervalSeconds),
    softwareVersion: "1.0.0",
  };
}

function buildLookup(rows) {
  return Object.fromEntries(rows.map((row) => [row.id, row]));
}

function resolveActiveSchedulePlaylist(displayId, schedules, playlistsById) {
  const now = new Date();
  const day = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();

  const candidates = schedules
    .filter((schedule) => schedule.active !== false && schedule.displayIds?.includes(displayId))
    .filter((schedule) => {
      if (schedule.startDate && schedule.startDate > now.toISOString().slice(0, 10)) return false;
      if (schedule.endDate && schedule.endDate < now.toISOString().slice(0, 10)) return false;
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

function resolveActiveEmergencyAlert(display, alerts, groups) {
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

function getWeekdayKey(date = new Date()) {
  const day = date.getDay();
  if (day === 0 || day === 6) return null;
  const keys = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  return keys[day - 1] || null;
}

const WEEKDAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const DINING_DAY_LABELS = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
};
const MEAL_PERIODS = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
];

function emptyDayMeals() {
  return { breakfast: [], lunch: [], dinner: [] };
}

function serializeMenuForPlayer(menu = {}) {
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

function buildDiningWeekDays(menu = {}, date = new Date()) {
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

function buildDiningPayload(menu) {
  if (!menu) return null;
  const dayKey = getWeekdayKey();
  const week = buildDiningWeekDays(menu);
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
  const hour = new Date().getHours();
  let nextMeal = "dinner";
  if (hour < 10) nextMeal = "breakfast";
  else if (hour < 15) nextMeal = "lunch";

  return {
    ...base,
    today,
    nextMeal: { period: nextMeal, items: today[nextMeal] || [] },
    weekend: false,
  };
}

function resolveActiveDiningMenu(menus = [], preferredMenuId = "") {
  if (preferredMenuId) {
    const match = menus.find((menu) => menu.id === preferredMenuId && menu.active !== false);
    if (match) return match;
  }
  const activeMenus = menus.filter((menu) => menu.active !== false);
  if (!activeMenus.length) return null;
  const target = new Date().toISOString().slice(0, 10);
  const dated = activeMenus
    .filter((menu) => menu.weekStartDate && menu.weekStartDate <= target)
    .sort((a, b) => String(b.weekStartDate).localeCompare(String(a.weekStartDate)));
  return dated[0] || activeMenus[0];
}

function buildWidgetSnapshot(widgetType, diningPayload) {
  const now = new Date();
  const snapshots = {
    clock: {
      time: now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
      date: now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }),
    },
    weather: { summary: "Check local conditions before travel to on-campus sessions." },
    announcements: { summary: "Academy announcements rotate from assigned playlists." },
    dining: diningPayload,
    testing_status: { summary: "Visit the testing center monitor for active exam sessions." },
    certification_status: { summary: "Certification renewals and pending approvals are tracked in the portal." },
    certification_metrics: { summary: "Certification metrics dashboard publishes renewals and compliance counts." },
    housing_status: { summary: "Housing check-in begins at 3:00 PM for on-campus classes." },
    lms_progress: { summary: "LMS completion sync is available when integration is enabled." },
    student_stats: { summary: "Enrollment and registration metrics publish to executive dashboards." },
    instructor_dashboard: { summary: "Instructors can review classes, attendance, and skills from their portal." },
    emergency: { summary: "Emergency alerts override normal signage when activated." },
    active911: { summary: "Active911 incident feed requires public safety integration." },
    cad_dashboard: { summary: "CAD dashboard requires dispatch integration." },
    qr_code: { summary: "Scan QR codes for student check-in and visitor information." },
    video: { summary: "Assign a video URL in the media library for this widget zone." },
    pdf: { summary: "Assign a PDF URL in the media library for this widget zone." },
    office: { summary: "Assign a PowerPoint or Office URL for this widget zone." },
    html: { summary: "Custom HTML widgets embed approved web content." },
  };
  return snapshots[widgetType] || { summary: widgetType };
}

function estimatePlayerStoragePct(itemCount = 0, zoneCount = 0) {
  return Math.min(95, 12 + itemCount * 4 + zoneCount * 3);
}

export async function getDigitalDisplayPayload(displayId, publicKey, options = {}) {
  const virtualSession = Boolean(options.virtualSession);
  if (virtualSession && !(await isVirtualPlayerEnabled())) {
    throw new HttpsError("failed-precondition", "Virtual player is disabled.");
  }

  if (!(await isPublicPlayerEnabled())) {
    throw new HttpsError("failed-precondition", "Public display player is disabled.");
  }

  const displayRef = db().doc(`digitalDashboardDisplays/${displayId}`);
  const displaySnap = await displayRef.get();
  if (!displaySnap.exists) {
    throw new HttpsError("not-found", "Display not found.");
  }

  const display = { id: displaySnap.id, ...displaySnap.data() };
  if (display.publicKey !== publicKey) {
    throw new HttpsError("permission-denied", "Invalid display key.");
  }

  const [settingsSnap, mediaSnap, playlistsSnap, schedulesSnap, groupsSnap, layoutsSnap, alertsSnap, diningSnap] =
    await Promise.all([
    db().doc("systemSettings/default").get(),
    db().collection("digitalDashboardMedia").get(),
    db().collection("digitalDashboardPlaylists").get(),
    db().collection("digitalDashboardSchedules").get(),
    db().collection("digitalDashboardGroups").get(),
    db().collection("digitalDashboardLayouts").get(),
    db().collection("digitalDashboardAlerts").get(),
    db().collection("digitalDashboardDiningMenus").get(),
  ]);

  const approvalRequired =
    settingsSnap.exists && settingsSnap.data()?.digitalDashboard?.mediaApprovalRequired === true;
  const media = mediaSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const playlists = playlistsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const schedules = schedulesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const groups = groupsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const layouts = layoutsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const alerts = alertsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const diningMenus = diningSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const mediaById = buildLookup(media);
  const playlistsById = buildLookup(playlists);
  const layoutsById = buildLookup(layouts);
  const defaultDiningMenu = resolveActiveDiningMenu(diningMenus, display.diningMenuId || "");
  const diningPayload = buildDiningPayload(defaultDiningMenu);
  const emergencyAlert = resolveActiveEmergencyAlert(display, alerts, groups);

  const scheduledPlaylist = resolveActiveSchedulePlaylist(displayId, schedules, playlistsById);
  const playlist = scheduledPlaylist || playlistsById[display.playlistId] || null;
  const items = (playlist?.itemIds || [])
    .map((id) => mediaById[id])
    .filter((item) => isMediaPublishable(item, approvalRequired));

  function resolveLiveMenu(item, zoneMenuId = "") {
    const menuId = item?.diningMenuId || zoneMenuId || display.diningMenuId || "";
    return menuId ? resolveActiveDiningMenu(diningMenus, menuId) : null;
  }

  function diningPayloadForItem(item) {
    const liveMenu = resolveLiveMenu(item);
    if (liveMenu) return buildDiningPayload(liveMenu);
    if (item?.diningMenuSnapshot) return buildDiningPayload(item.diningMenuSnapshot);
    return null;
  }

  const layout = display.layoutId ? layoutsById[display.layoutId] : null;

  const referencedMenuIds = new Set();
  if (display.diningMenuId) referencedMenuIds.add(display.diningMenuId);
  for (const item of items) {
    if (item?.diningMenuId) referencedMenuIds.add(item.diningMenuId);
  }
  if (layout?.zones?.length) {
    for (const zone of layout.zones) {
      if (zone.widgetType === "dining" && zone.diningMenuId) {
        referencedMenuIds.add(zone.diningMenuId);
      }
    }
  }
  const diningMenusForPlayer = (referencedMenuIds.size
    ? diningMenus.filter((menu) => referencedMenuIds.has(menu.id))
    : diningMenus.filter((menu) => menu.active !== false)
  ).map((menu) => serializeMenuForPlayer(menu));

  const layoutZones = layout
    ? (layout.zones || []).map((zone) => ({
        ...zone,
        data:
          zone.widgetType === "dining"
            ? buildDiningPayload(resolveActiveDiningMenu(diningMenus, zone.diningMenuId || display.diningMenuId || ""))
            : buildWidgetSnapshot(zone.widgetType, diningPayload),
      }))
    : null;

  const pendingRemoteAction = display.pendingRemoteAction || "";
  const nowIso = new Date().toISOString();
  const playerStoragePct = estimatePlayerStoragePct(items.length, layoutZones?.length || 0);
  const playerConfig = await getPlayerConfig();
  const skipDeviceTelemetry = virtualSession || display.isVirtual === true;

  if (!skipDeviceTelemetry && items.length) {
    await incrementMediaImpressions(items.map((item) => item.id));
  }

  if (!skipDeviceTelemetry) {
    await displayRef.set(
      {
        status: "online",
        lastSyncAt: nowIso,
        lastSeenAt: nowIso,
        heartbeatAt: nowIso,
        connectivityStatus: "connected",
        storageUtilizationPct: playerStoragePct,
        softwareVersion: display.softwareVersion || "1.0.0",
        contentViews: FieldValue.increment(1),
        ...(pendingRemoteAction ? { pendingRemoteAction: "" } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } else if (pendingRemoteAction) {
    await displayRef.set(
      {
        pendingRemoteAction: "",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  return {
    display: {
      id: display.id,
      name: display.name,
      orientation: display.orientation,
      resolution: display.resolution,
      displayType: display.displayType,
      layoutId: display.layoutId || "",
      diningMenuId: display.diningMenuId || "",
      softwareVersion: display.softwareVersion || "1.0.0",
    },
    remoteCommand: pendingRemoteAction || null,
    emergencyAlert: emergencyAlert
      ? {
          id: emergencyAlert.id,
          title: emergencyAlert.title,
          message: emergencyAlert.message,
          mode: emergencyAlert.mode || "fullscreen",
          priority: emergencyAlert.priority || 10,
        }
      : null,
    layout: layout
      ? {
          id: layout.id,
          name: layout.name,
          templateId: layout.templateId,
          zones: layoutZones,
        }
      : null,
    dining: diningPayload,
    playlist: playlist
      ? {
          id: playlist.id,
          name: playlist.name,
          loop: playlist.loop !== false,
          transition: playlist.transition || "fade",
          priority: playlist.priority || 1,
        }
      : null,
    items: items.map((item) => {
      const liveMenu = resolveLiveMenu(item);
      const snapshot = liveMenu ? serializeMenuForPlayer(liveMenu) : item.diningMenuSnapshot || null;
      return {
        id: item.id,
        title: item.title,
        type: item.type,
        widgetType: item.widgetType || "",
        diningMenuId: item.diningMenuId || "",
        diningMenuSnapshot: snapshot,
        durationSec: item.durationSec,
        content: item.content,
        url: item.url,
        priority: item.priority || 1,
        dining: item.widgetType === "dining" ? diningPayloadForItem(item) : null,
      };
    }),
    diningMenus: diningMenusForPlayer,
    playerConfig,
    virtualSession: skipDeviceTelemetry,
  };
}

export async function touchDigitalDisplaySync(displayId, publicKey) {
  await getDigitalDisplayPayload(displayId, publicKey);
  return { ok: true };
}
