import {
  MEDIA_APPROVAL_STATUSES,
  MEDIA_SOURCES,
} from "./digitalDashboard.js";

/** Curated stock assets (MVIX-style stock library starter set). */
export const STOCK_MEDIA_CATALOG = [
  {
    id: "forge-fire-training-1",
    provider: "unsplash",
    type: "image",
    title: "Firefighter training drill",
    url: "https://images.unsplash.com/photo-1541336032412-9748e20768b9?auto=format&fit=crop&w=1920&q=80",
    credit: "Unsplash · firefighter training",
    tags: ["training", "firefighter"],
  },
  {
    id: "forge-campus-lobby-1",
    provider: "unsplash",
    type: "image",
    title: "Campus lobby welcome",
    url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80",
    credit: "Unsplash · modern lobby",
    tags: ["lobby", "welcome"],
  },
  {
    id: "forge-safety-gear-1",
    provider: "unsplash",
    type: "image",
    title: "Safety equipment layout",
    url: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=1920&q=80",
    credit: "Unsplash · safety equipment",
    tags: ["safety", "equipment"],
  },
  {
    id: "forge-classroom-1",
    provider: "pexels",
    type: "image",
    title: "Classroom instruction",
    url: "https://images.pexels.com/photos/256395/pexels-photo-256395.jpeg?auto=compress&cs=tinysrgb&w=1920",
    credit: "Pexels · classroom",
    tags: ["classroom", "training"],
  },
  {
    id: "forge-emergency-1",
    provider: "unsplash",
    type: "image",
    title: "Emergency response briefing",
    url: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1920&q=80",
    credit: "Unsplash · emergency services",
    tags: ["emergency", "briefing"],
  },
  {
    id: "forge-dining-1",
    provider: "unsplash",
    type: "image",
    title: "Dining hall service",
    url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1920&q=80",
    credit: "Unsplash · dining",
    tags: ["dining", "campus"],
  },
];

/**
 * @param {Record<string, unknown>} item
 * @param {{ digitalDashboard?: { mediaApprovalRequired?: boolean } } | null | undefined} settings
 */
export function isMediaPublishable(item, settings = null) {
  if (!item || item.active === false) return false;

  const approvalRequired = settings?.digitalDashboard?.mediaApprovalRequired === true;
  const status = item.approvalStatus || MEDIA_APPROVAL_STATUSES.APPROVED;
  if (approvalRequired && status !== MEDIA_APPROVAL_STATUSES.APPROVED) return false;

  const today = new Date().toISOString().slice(0, 10);
  if (item.validFrom && item.validFrom > today) return false;
  if (item.validTo && item.validTo < today) return false;

  return Boolean(item.url || item.content);
}

/**
 * @param {Record<string, unknown>[]} media
 * @param {Record<string, unknown>[]} playlists
 * @param {Record<string, unknown>[]} schedules
 */
export function buildMediaUsageMap(media = [], playlists = [], schedules = []) {
  /** @type {Map<string, { playlistCount: number, scheduleCount: number, playlistNames: string[], scheduleNames: string[] }>} */
  const usage = new Map();

  for (const item of media) {
    usage.set(item.id, {
      playlistCount: 0,
      scheduleCount: 0,
      playlistNames: [],
      scheduleNames: [],
    });
  }

  for (const playlist of playlists) {
    for (const mediaId of playlist.itemIds || []) {
      const row = usage.get(mediaId);
      if (!row) continue;
      row.playlistCount += 1;
      row.playlistNames.push(playlist.name || playlist.id);
    }
  }

  for (const schedule of schedules) {
    if (!schedule.playlistId) continue;
    const playlist = playlists.find((item) => item.id === schedule.playlistId);
    if (!playlist) continue;
    for (const mediaId of playlist.itemIds || []) {
      const row = usage.get(mediaId);
      if (!row) continue;
      row.scheduleCount += 1;
      row.scheduleNames.push(schedule.name || schedule.id);
    }
  }

  return usage;
}

/**
 * @param {Record<string, unknown>[]} media
 * @param {Map<string, { playlistCount: number, scheduleCount: number, playlistNames: string[], scheduleNames: string[] }>} usageMap
 */
export function enrichMediaWithUsage(media = [], usageMap) {
  return media.map((item) => {
    const usage = usageMap.get(item.id) || {
      playlistCount: 0,
      scheduleCount: 0,
      playlistNames: [],
      scheduleNames: [],
    };
    return {
      ...item,
      usagePlaylistCount: usage.playlistCount,
      usageScheduleCount: usage.scheduleCount,
      usagePlaylistNames: usage.playlistNames,
      usageScheduleNames: usage.scheduleNames,
      usageScore:
        usage.playlistCount + usage.scheduleCount + (Number(item.impressionCount) || 0),
    };
  });
}

/** @param {Record<string, unknown>[]} media @param {string} folderId */
export function filterMediaByFolder(media = [], folderId = "") {
  if (!folderId || folderId === "all") return media;
  if (folderId === "uncategorized") return media.filter((item) => !item.folderId);
  return media.filter((item) => item.folderId === folderId);
}

/** @param {Record<string, unknown>[]} media @param {string} approvalFilter */
export function filterMediaByApproval(media = [], approvalFilter = "all") {
  if (approvalFilter === "all") return media;
  if (approvalFilter === "pending") {
    return media.filter(
      (item) =>
        item.approvalStatus === MEDIA_APPROVAL_STATUSES.PENDING ||
        item.approvalStatus === MEDIA_APPROVAL_STATUSES.DRAFT,
    );
  }
  return media.filter((item) => item.approvalStatus === approvalFilter);
}

/**
 * @param {Record<string, unknown>} stockAsset
 * @param {{ mediaApprovalRequired?: boolean }} [options]
 */
export function mediaRecordFromStockAsset(stockAsset, options = {}) {
  const approvalStatus = options.mediaApprovalRequired
    ? MEDIA_APPROVAL_STATUSES.PENDING
    : MEDIA_APPROVAL_STATUSES.APPROVED;
  return {
    title: stockAsset.title,
    type: stockAsset.type || "image",
    url: stockAsset.url,
    description: stockAsset.credit,
    stockProvider: stockAsset.provider,
    stockAssetId: stockAsset.id,
    stockCredit: stockAsset.credit,
    source: MEDIA_SOURCES.STOCK,
    tags: stockAsset.tags || [],
    approvalStatus,
    active: true,
    durationSec: 10,
  };
}

/** @param {string} status */
export function approvalStatusTone(status = "") {
  if (status === MEDIA_APPROVAL_STATUSES.APPROVED) return "success";
  if (status === MEDIA_APPROVAL_STATUSES.PENDING) return "warning";
  if (status === MEDIA_APPROVAL_STATUSES.REJECTED) return "critical";
  return "info";
}
