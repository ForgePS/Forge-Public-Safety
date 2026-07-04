import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { validateProfileImageFile } from "./profilePhotoCrop.js";
import { storage } from "./firebase.js";

function profileStorageRef(userId) {
  return ref(storage, `portal-user-profiles/${userId}/profile.jpg`);
}

/** @param {File | Blob} file */
function validateProfileImage(file) {
  if (file instanceof File) {
    validateProfileImageFile(file);
    return;
  }

  if (file.type !== "image/jpeg") {
    throw new Error("Profile photo must be a JPEG image.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be 5 MB or smaller.");
  }
}

/**
 * @param {string} userId
 * @param {File | Blob} file
 * @returns {Promise<string>} Public download URL
 */
export async function uploadPortalUserProfilePhoto(userId, file) {
  if (!userId) throw new Error("Save the portal user before uploading a photo.");
  validateProfileImage(file);
  const storageRef = profileStorageRef(userId);
  await uploadBytes(storageRef, file, { contentType: "image/jpeg" });
  return getDownloadURL(storageRef);
}

/** @param {string} userId */
export async function removePortalUserProfilePhoto(userId) {
  if (!userId) return;
  try {
    await deleteObject(profileStorageRef(userId));
  } catch (err) {
    if (err?.code !== "storage/object-not-found") {
      throw err;
    }
  }
}
