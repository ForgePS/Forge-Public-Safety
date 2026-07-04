import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase.js";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

/** @param {string} name */
function sanitizeFileName(name) {
  return String(name ?? "file")
    .replace(/[^\w.\-() ]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 120);
}

/** @param {File} file @param {number} maxMb */
export function validateMessageAttachment(file, maxMb = 25) {
  if (!file) throw new Error("Choose a file to upload.");
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`Files must be ${maxMb} MB or smaller.`);
  }
  if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith("image/")) {
    throw new Error("Unsupported file type for messaging.");
  }
}

/**
 * @param {string} conversationId
 * @param {string} messageId
 * @param {File} file
 */
export async function uploadMessageAttachment(conversationId, messageId, file) {
  const fileName = sanitizeFileName(file.name);
  const storagePath = `message-attachments/${conversationId}/${messageId}/${fileName}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type || "application/octet-stream" });
  const url = await getDownloadURL(storageRef);
  return {
    fileName: file.name,
    storagePath,
    url,
    mimeType: file.type || "application/octet-stream",
    fileSize: file.size,
  };
}
