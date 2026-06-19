import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase.js";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** @param {File} file */
export function validateCertificateTemplateImage(file) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Certificate background must be JPEG, PNG, or WebP.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Certificate background must be 15 MB or smaller.");
  }
}

/** @param {string} name */
function sanitizeFileName(name) {
  return String(name || "background").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

/**
 * @param {string} templateId
 * @param {File} file
 * @param {'background' | 'signature'} assetType
 * @returns {Promise<{ url: string, storagePath: string, fileName: string }>}
 */
export async function uploadCertificateTemplateAsset(templateId, file, assetType = "background") {
  validateCertificateTemplateImage(file);
  const fileName = `${assetType}-${sanitizeFileName(file.name)}`;
  const storagePath = `certificate-templates/${templateId}/${fileName}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const url = await getDownloadURL(storageRef);
  return { url, storagePath, fileName };
}

/** @param {string | undefined} storagePath */
export async function deleteCertificateTemplateAsset(storagePath) {
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
