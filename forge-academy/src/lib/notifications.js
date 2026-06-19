import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase.js";

/**
 * @typedef {Object} NotificationRecord
 * @property {string} id
 * @property {string} recipientUid
 * @property {string} type
 * @property {string} entityType
 * @property {string} entityId
 * @property {string} title
 * @property {string} body
 * @property {string} link
 * @property {boolean} read
 * @property {number} priority
 * @property {import('firebase/firestore').Timestamp | null} createdAt
 */

function mapNotification(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    recipientUid: data.recipientUid ?? "",
    type: data.type ?? "",
    entityType: data.entityType ?? "",
    entityId: data.entityId ?? "",
    title: data.title ?? "",
    body: data.body ?? "",
    link: data.link ?? "/",
    read: Boolean(data.read),
    priority: Number(data.priority ?? 0),
    createdAt: data.createdAt ?? null,
  };
}

export async function syncMyNotifications() {
  const callable = httpsCallable(functions, "syncMyNotificationsCallable");
  const result = await callable({});
  return result.data ?? {};
}

/** @param {string} userId @param {(rows: NotificationRecord[]) => void} callback */
export function subscribeToNotifications(userId, callback) {
  if (!userId) return () => {};

  const notificationsQuery = query(
    collection(db, "notifications"),
    where("recipientUid", "==", userId),
    limit(60),
  );

  return onSnapshot(
    notificationsQuery,
    (snap) => {
      const rows = snap.docs
        .map((item) => mapNotification(item.id, item.data()))
        .filter(Boolean)
        .sort((a, b) => {
          if (a.read !== b.read) return a.read ? 1 : -1;
          const aMs = a.createdAt?.toMillis?.() ?? 0;
          const bMs = b.createdAt?.toMillis?.() ?? 0;
          return bMs - aMs;
        });
      callback(rows);
    },
    () => callback([]),
  );
}

/** @param {string} notificationId */
export async function markNotificationRead(notificationId) {
  await updateDoc(doc(db, "notifications", notificationId), {
    read: true,
    readAt: serverTimestamp(),
  });
}

/** @param {string} userId */
export async function markAllNotificationsRead(userId) {
  const snap = await getDocs(
    query(collection(db, "notifications"), where("recipientUid", "==", userId), limit(100)),
  );
  const batch = writeBatch(db);
  let count = 0;
  for (const item of snap.docs) {
    if (item.data().read) continue;
    batch.update(item.ref, { read: true, readAt: serverTimestamp() });
    count += 1;
  }
  if (count > 0) await batch.commit();
  return count;
}

/** @param {NotificationRecord[]} rows */
export function countUnreadNotifications(rows) {
  return rows.filter((row) => !row.read).length;
}

export function formatNotificationTime(createdAt) {
  if (!createdAt?.toDate) return "";
  const date = createdAt.toDate();
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
