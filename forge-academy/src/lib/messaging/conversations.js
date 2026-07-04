import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase.js";

/**
 * @typedef {Object} ConversationParticipant
 * @property {string} displayName
 * @property {string} photoUrl
 * @property {import('firebase/firestore').Timestamp | null} [lastReadAt]
 */

/**
 * @typedef {Object} ConversationRecord
 * @property {string} id
 * @property {'direct' | 'group'} type
 * @property {string} title
 * @property {string[]} participantUids
 * @property {Record<string, ConversationParticipant>} participants
 * @property {string} lastMessagePreview
 * @property {string} lastMessageSenderUid
 * @property {number} lastMessageAttachmentCount
 * @property {import('firebase/firestore').Timestamp | null} lastMessageAt
 * @property {import('firebase/firestore').Timestamp | null} createdAt
 */

/** @param {string[]} uids */
export function buildDirectConversationId(uids) {
  return `direct_${[...uids].sort().join("_")}`;
}

/** @param {string} id @param {Record<string, unknown>} data */
function mapConversation(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    type: data.type === "group" ? "group" : "direct",
    title: String(data.title ?? ""),
    participantUids: Array.isArray(data.participantUids) ? data.participantUids.map(String) : [],
    participants: data.participants ?? {},
    lastMessagePreview: String(data.lastMessagePreview ?? ""),
    lastMessageSenderUid: String(data.lastMessageSenderUid ?? ""),
    lastMessageAttachmentCount: Number(data.lastMessageAttachmentCount ?? 0),
    lastMessageAt: data.lastMessageAt ?? null,
    createdAt: data.createdAt ?? null,
  };
}

/** @param {string} userId @param {(rows: ConversationRecord[]) => void} callback */
export function subscribeToConversations(userId, callback) {
  if (!userId) return () => {};

  const conversationsQuery = query(
    collection(db, "conversations"),
    where("participantUids", "array-contains", userId),
  );

  return onSnapshot(
    conversationsQuery,
    (snap) => {
      const rows = snap.docs
        .map((item) => mapConversation(item.id, item.data()))
        .filter(Boolean)
        .sort((a, b) => {
          const aMs = a.lastMessageAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
          const bMs = b.lastMessageAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
          return bMs - aMs;
        });
      callback(rows);
    },
    () => callback([]),
  );
}

/** @param {string} conversationId */
export async function getConversation(conversationId) {
  const snap = await getDoc(doc(db, "conversations", conversationId));
  if (!snap.exists()) return null;
  return mapConversation(snap.id, snap.data());
}

/**
 * @param {import('../users.js').AppUserRecord} currentUser
 * @param {import('./userDirectory.js').MessagingDirectoryEntry} otherUser
 */
export async function getOrCreateDirectConversation(currentUser, otherUser) {
  const conversationId = buildDirectConversationId([currentUser.uid, otherUser.uid]);
  const ref = doc(db, "conversations", conversationId);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    return mapConversation(existing.id, existing.data());
  }

  const participants = {
    [currentUser.uid]: {
      displayName: currentUser.displayName,
      photoUrl: currentUser.photoUrl ?? "",
      lastReadAt: serverTimestamp(),
    },
    [otherUser.uid]: {
      displayName: otherUser.displayName,
      photoUrl: otherUser.photoUrl ?? "",
      lastReadAt: null,
    },
  };

  const payload = {
    type: "direct",
    title: otherUser.displayName,
    participantUids: [currentUser.uid, otherUser.uid],
    participants,
    lastMessagePreview: "",
    lastMessageSenderUid: "",
    lastMessageAttachmentCount: 0,
    lastMessageAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    createdBy: currentUser.uid,
  };

  await setDoc(ref, payload, { merge: true });
  return mapConversation(conversationId, payload);
}

/**
 * @param {import('../users.js').AppUserRecord} currentUser
 * @param {import('./userDirectory.js').MessagingDirectoryEntry[]} selectedUsers
 * @param {string} title
 */
export async function createGroupConversation(currentUser, selectedUsers, title) {
  const uniqueOthers = selectedUsers.filter((entry) => entry.uid !== currentUser.uid);
  const participantUids = [currentUser.uid, ...uniqueOthers.map((entry) => entry.uid)];
  const conversationId = `group_${Date.now()}_${currentUser.uid.slice(0, 6)}`;

  /** @type {Record<string, ConversationParticipant>} */
  const participants = {
    [currentUser.uid]: {
      displayName: currentUser.displayName,
      photoUrl: currentUser.photoUrl ?? "",
      lastReadAt: serverTimestamp(),
    },
  };

  for (const entry of uniqueOthers) {
    participants[entry.uid] = {
      displayName: entry.displayName,
      photoUrl: entry.photoUrl ?? "",
      lastReadAt: null,
    };
  }

  const payload = {
    type: "group",
    title: title.trim() || "Group chat",
    participantUids,
    participants,
    lastMessagePreview: "",
    lastMessageSenderUid: "",
    lastMessageAttachmentCount: 0,
    lastMessageAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    createdBy: currentUser.uid,
  };

  await setDoc(doc(db, "conversations", conversationId), payload);
  return mapConversation(conversationId, payload);
}

/** @param {string} conversationId @param {string} userId */
export async function markConversationRead(conversationId, userId) {
  await updateDoc(doc(db, "conversations", conversationId), {
    [`participants.${userId}.lastReadAt`]: serverTimestamp(),
  });
}

/** @param {ConversationRecord} conversation @param {string} userId */
export function conversationTitleForUser(conversation, userId) {
  if (conversation.type === "group") return conversation.title || "Group chat";
  const otherUid = conversation.participantUids.find((uid) => uid !== userId);
  if (!otherUid) return conversation.title || "Direct message";
  return conversation.participants?.[otherUid]?.displayName || conversation.title || "Direct message";
}

/** @param {ConversationRecord} conversation @param {string} userId */
export function isConversationUnread(conversation, userId) {
  if (!conversation.lastMessageAt) return false;
  if (conversation.lastMessageSenderUid === userId) return false;
  const lastReadAt = conversation.participants?.[userId]?.lastReadAt;
  if (!lastReadAt?.toMillis) return true;
  const messageMs = conversation.lastMessageAt.toMillis?.() ?? 0;
  return messageMs > lastReadAt.toMillis();
}

/** @param {ConversationRecord[]} conversations @param {string} userId */
export function countUnreadConversations(conversations, userId) {
  return conversations.filter((conversation) => isConversationUnread(conversation, userId)).length;
}

/** @param {string} conversationId @param {import('./userDirectory.js').MessagingDirectoryEntry} entry */
export async function addParticipantToGroup(conversationId, entry) {
  await updateDoc(doc(db, "conversations", conversationId), {
    participantUids: arrayUnion(entry.uid),
    [`participants.${entry.uid}`]: {
      displayName: entry.displayName,
      photoUrl: entry.photoUrl ?? "",
      lastReadAt: null,
    },
  });
}
