import { createId } from "../core/ids.js";
import { isFirebaseStorageConfigured, uploadMediaFile } from "./firebase.js";

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_LOCAL_BYTES = 500 * 1024; // Keep localStorage uploads small to avoid quota errors

function sanitizeFilename(name) {
  return (name || "image").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function validateImageFile(file) {
  if (!file) return "No file selected";
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "Please upload a JPG, PNG, GIF, WebP, or SVG image";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "Image must be smaller than 10 MB";
  }
  if (!isFirebaseStorageConfigured() && file.size > MAX_LOCAL_BYTES) {
    return "Local browser storage limit is 500 KB per image. Configure Firebase Storage for uploads up to 10 MB.";
  }
  return null;
}

export async function uploadImage(file, { store, programId, userId = "system" } = {}) {
  const error = validateImageFile(file);
  if (error) throw new Error(error);

  const mediaId = createId("media");
  let url;
  let storagePath = null;

  if (isFirebaseStorageConfigured()) {
    storagePath = `cms-media/${programId || "default"}/${Date.now()}-${sanitizeFilename(file.name)}`;
    url = await uploadMediaFile(file, storagePath);
  } else {
    url = await readFileAsDataURL(file);
  }

  const item = {
    id: mediaId,
    name: file.name,
    url,
    storagePath,
    type: "image",
    mimeType: file.type,
    alt: "",
    caption: "",
    size: file.size,
    createdAt: new Date().toISOString(),
    storageBackend: storagePath ? "firebase" : "local",
  };

  if (store?.save) {
    await store.save("media", item, userId);
  }

  return item;
}

export function isImageUrl(value) {
  if (!value || typeof value !== "string") return false;
  return value.startsWith("data:image/") ||
    value.startsWith("blob:") ||
    /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(value) ||
    value.startsWith("/assets/") ||
    value.includes("firebasestorage.googleapis.com") ||
    value.includes("firebasestorage.app");
}
