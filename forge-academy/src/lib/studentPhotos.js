import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { validateProfileImageFile } from "./profilePhotoCrop.js";
import { updateStudentSelfProfile } from "./students.js";
import { storage } from "./firebase.js";

function profileStorageRef(studentId) {
  return ref(storage, `student-profiles/${studentId}/profile.jpg`);
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

/** @param {string} studentId @param {string} profilePictureUrl */
export async function setStudentProfilePictureUrl(studentId, profilePictureUrl) {
  await updateStudentSelfProfile(studentId, { profilePictureUrl });
}

/**
 * @param {string} studentId
 * @param {File | Blob} file
 * @returns {Promise<string>} Public download URL
 */
export async function uploadStudentProfilePhoto(studentId, file) {
  validateProfileImage(file);
  const storageRef = profileStorageRef(studentId);
  await uploadBytes(storageRef, file, { contentType: "image/jpeg" });
  const url = await getDownloadURL(storageRef);
  await setStudentProfilePictureUrl(studentId, url);
  return url;
}

/** @param {string} studentId */
export async function removeStudentProfilePhoto(studentId) {
  try {
    await deleteObject(profileStorageRef(studentId));
  } catch (err) {
    if (err?.code !== "storage/object-not-found") {
      throw err;
    }
  }

  await setStudentProfilePictureUrl(studentId, "");
}
