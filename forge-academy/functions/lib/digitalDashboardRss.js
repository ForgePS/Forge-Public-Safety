import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

const db = () => getFirestore();

const MEDIA_APPROVAL_STATUSES = {
  PENDING: "pending",
  APPROVED: "approved",
};
const MEDIA_SOURCES = { RSS: "rss" };

function createDigitalDashboardId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`.toUpperCase();
}

function decodeXml(value = "") {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseRssItems(xml = "") {
  const items = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const block of blocks) {
    const title = decodeXml((block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
    const link = decodeXml((block.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1] || "");
    const description = decodeXml((block.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || [])[1] || "");
    const enclosureUrl = decodeXml((block.match(/<enclosure[^>]+url="([^"]+)"/i) || [])[1] || "");
    if (!title && !link && !description) continue;
    items.push({ title, link, description, enclosureUrl });
  }
  return items.slice(0, 25);
}

async function isRssEnabled() {
  const snap = await db().doc("systemSettings/default").get();
  if (!snap.exists) return true;
  return snap.data()?.digitalDashboard?.rssFeedsEnabled !== false;
}

async function isMediaApprovalRequired() {
  const snap = await db().doc("systemSettings/default").get();
  if (!snap.exists) return false;
  return snap.data()?.digitalDashboard?.mediaApprovalRequired === true;
}

/** @param {string} feedId */
export async function syncDigitalDashboardRssFeed(feedId) {
  if (!(await isRssEnabled())) {
    throw new HttpsError("failed-precondition", "RSS feeds are disabled in system settings.");
  }

  const feedRef = db().doc(`digitalDashboardRssFeeds/${feedId}`);
  const feedSnap = await feedRef.get();
  if (!feedSnap.exists) {
    throw new HttpsError("not-found", "RSS feed not found.");
  }

  const feed = { id: feedSnap.id, ...feedSnap.data() };
  if (!feed.feedUrl) {
    throw new HttpsError("invalid-argument", "RSS feed URL is required.");
  }

  const response = await fetch(feed.feedUrl, {
    headers: { "User-Agent": "Forge-Displays-RSS/1.0" },
  });
  if (!response.ok) {
    throw new HttpsError("internal", `Unable to fetch RSS feed (${response.status}).`);
  }

  const xml = await response.text();
  const items = parseRssItems(xml);
  const approvalStatus = (await isMediaApprovalRequired())
    ? MEDIA_APPROVAL_STATUSES.PENDING
    : MEDIA_APPROVAL_STATUSES.APPROVED;
  let created = 0;
  let updated = 0;

  for (const item of items) {
    const mediaId = createDigitalDashboardId("DDM");
    const stableKey = `${feedId}:${item.link || item.title}`.slice(0, 120);
    const existingSnap = await db()
      .collection("digitalDashboardMedia")
      .where("rssFeedId", "==", feedId)
      .where("rssItemKey", "==", stableKey)
      .limit(1)
      .get();

    const payload = {
      title: item.title || "RSS item",
      type: item.enclosureUrl?.match(/\.(mp4|webm|mov)/i) ? "video" : item.enclosureUrl ? "image" : "announcement",
      content: item.description || "",
      url: item.enclosureUrl || item.link || "",
      folderId: feed.folderId || "",
      rssFeedId: feedId,
      rssItemKey: stableKey,
      source: MEDIA_SOURCES.RSS,
      approvalStatus,
      active: true,
      durationSec: 12,
      tags: ["rss"],
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (existingSnap.empty) {
      await db().doc(`digitalDashboardMedia/${mediaId}`).set({
        ...payload,
        id: mediaId,
        impressionCount: 0,
        createdAt: FieldValue.serverTimestamp(),
      });
      created += 1;
    } else {
      await existingSnap.docs[0].ref.set(payload, { merge: true });
      updated += 1;
    }
  }

  await feedRef.set(
    {
      lastSyncedAt: new Date().toISOString(),
      itemCount: items.length,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { feedId, created, updated, itemCount: items.length };
}

/** @param {string[]} itemIds */
export async function incrementMediaImpressions(itemIds = []) {
  const uniqueIds = [...new Set(itemIds.filter(Boolean))];
  if (!uniqueIds.length) return;
  const batch = db().batch();
  for (const id of uniqueIds) {
    batch.set(
      db().doc(`digitalDashboardMedia/${id}`),
      {
        impressionCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
  await batch.commit();
}
