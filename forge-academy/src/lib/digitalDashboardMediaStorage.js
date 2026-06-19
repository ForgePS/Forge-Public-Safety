import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase.js";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

/** @type {Record<string, { types: string[], maxBytes: number, label: string }>} */
export const MEDIA_UPLOAD_RULES = {
  image: {
    types: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxBytes: MAX_IMAGE_BYTES,
    label: "Image",
  },
  video: {
    types: ["video/mp4", "video/webm", "video/quicktime"],
    maxBytes: MAX_VIDEO_BYTES,
    label: "Video",
  },
  pdf: {
    types: ["application/pdf"],
    maxBytes: MAX_DOCUMENT_BYTES,
    label: "PDF",
  },
  office: {
    types: [
      "application/pdf",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
    maxBytes: MAX_DOCUMENT_BYTES,
    label: "Office document",
  },
};

/** @param {string} mediaType */
export function mediaTypeSupportsUpload(mediaType) {
  return Boolean(MEDIA_UPLOAD_RULES[mediaType]);
}

/** @param {number} bytes */
export function formatMediaFileSize(bytes) {
  const value = Number(bytes);
  if (!value || value <= 0) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

/** @param {string} mediaType */
export function getMediaUploadAccept(mediaType) {
  const rules = MEDIA_UPLOAD_RULES[mediaType];
  if (!rules) return "";
  return rules.types.join(",");
}

/** @param {string} mediaType @param {File} file */
export function inferMediaTypeFromFile(file) {
  if (!file?.type) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf") return "pdf";
  if (
    file.type.includes("presentation") ||
    file.type.includes("powerpoint") ||
    file.name.match(/\.(ppt|pptx)$/i)
  ) {
    return "office";
  }
  if (file.type.startsWith("image/")) return "image";
  return "image";
}

/** @param {File} file @param {string} mediaType */
export function validateDigitalDashboardMediaFile(file, mediaType) {
  const rules = MEDIA_UPLOAD_RULES[mediaType];
  if (!rules) {
    throw new Error("This media type uses a URL or text content instead of file upload.");
  }
  if (!rules.types.includes(file.type)) {
    throw new Error(`${rules.label} must be one of: ${rules.types.join(", ")}`);
  }
  if (file.size > rules.maxBytes) {
    throw new Error(`${rules.label} must be ${Math.round(rules.maxBytes / (1024 * 1024))} MB or smaller.`);
  }
}

/** @param {string} name */
function sanitizeFileName(name) {
  return String(name || "asset").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

/** @param {string} mediaId @param {string} fileName */
function mediaStorageRef(mediaId, fileName) {
  return ref(storage, `digital-dashboard-media/${mediaId}/${fileName}`);
}

/**
 * @param {string} mediaId
 * @param {File} file
 * @param {string} mediaType
 * @returns {Promise<{ url: string, storagePath: string, fileName: string }>}
 */
export async function uploadDigitalDashboardMediaFile(mediaId, file, mediaType) {
  validateDigitalDashboardMediaFile(file, mediaType);
  const fileName = sanitizeFileName(file.name);
  const storagePath = `digital-dashboard-media/${mediaId}/${fileName}`;
  const storageRef = mediaStorageRef(mediaId, fileName);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const url = await getDownloadURL(storageRef);
  return {
    url,
    storagePath,
    fileName,
    fileSize: file.size,
    mimeType: file.type,
  };
}

/** @param {string | undefined} storagePath */
export async function deleteDigitalDashboardMediaFile(storagePath) {
  if (!storagePath) return;
  try {
    await deleteObject(ref(storage, storagePath));
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "storage/object-not-found") {
      return;
    }
    throw err;
  }
}
