import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase.js";
import { formatConversationPreview } from "./format.js";

/**
 * @typedef {Object} MessageAttachment
 * @property {string} fileName
 * @property {string} storagePath
 * @property {string} url
 * @property {string} mimeType
 * @property {number} fileSize
 */

/**
 * @typedef {Object} MessageRecord
 * @property {string} id
 * @property {string} senderUid
 * @property {string} senderName
 * @property {string} text
 * @property {MessageAttachment[]} attachments
 * @property {import('firebase/firestore').Timestamp | null} createdAt
 */

/** @param {string} id @param {Record<string, unknown>} data */
function mapMessage(id, data) {
  if (!data || typeof data !== "object") return null;
  return {
    id,
    senderUid: String(data.senderUid ?? ""),
    senderName: String(data.senderName ?? ""),
    text: String(data.text ?? ""),
    attachments: Array.isArray(data.attachments) ? data.attachments : [],
    createdAt: data.createdAt ?? null,
  };
}

/** @param {string} conversationId @param {(rows: MessageRecord[]) => void} callback */
export function subscribeToMessages(conversationId, callback) {
  if (!conversationId) return () => {};

  const messagesQuery = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("createdAt", "asc"),
  );

  return onSnapshot(
    messagesQuery,
    (snap) => {
      callback(snap.docs.map((item) => mapMessage(item.id, item.data())).filter(Boolean));
    },
    () => callback([]),
  );
}

/** @param {string} conversationId */
export function createMessageRef(conversationId) {
  return doc(collection(db, "conversations", conversationId, "messages"));
}

/**
 * @param {string} conversationId
 * @param {string} messageId
 * @param {{ uid: string, displayName: string }} sender
 * @param {{ text?: string, attachments?: MessageAttachment[] }} input
 */
export async function sendMessage(conversationId, messageId, sender, input) {
  const text = String(input.text ?? "").trim();
  const attachments = input.attachments ?? [];
  if (!text && attachments.length === 0) {
    throw new Error("Enter a message or attach a file.");
  }

  await setDoc(doc(db, "conversations", conversationId, "messages", messageId), {
    senderUid: sender.uid,
    senderName: sender.displayName,
    text,
    attachments,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "conversations", conversationId), {
    lastMessagePreview: formatConversationPreview(text, attachments.length),
    lastMessageSenderUid: sender.uid,
    lastMessageAttachmentCount: attachments.length,
    lastMessageAt: serverTimestamp(),
    [`participants.${sender.uid}.lastReadAt`]: serverTimestamp(),
  });

  return messageId;
}
