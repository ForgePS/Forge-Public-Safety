import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase.js";

/**
 * @typedef {Object} MessagingDirectoryEntry
 * @property {string} uid
 * @property {string} displayName
 * @property {string} email
 * @property {string} photoUrl
 * @property {string} role
 * @property {boolean} disabled
 */

/** @param {import('../users.js').AppUserRecord} user */
export async function syncUserDirectoryEntry(user) {
  if (!user?.uid) return;
  await setDoc(
    doc(db, "userDirectory", user.uid),
    {
      displayName: user.displayName ?? "",
      email: user.email ?? "",
      photoUrl: user.photoUrl ?? "",
      role: user.role ?? "",
      disabled: Boolean(user.disabled),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/** @returns {Promise<MessagingDirectoryEntry[]>} */
export async function listMessagingDirectory() {
  const snap = await getDocs(query(collection(db, "userDirectory"), limit(500)));
  return snap.docs
    .map((item) => {
      const data = item.data();
      if (data.disabled) return null;
      return {
        uid: item.id,
        displayName: String(data.displayName ?? ""),
        email: String(data.email ?? ""),
        photoUrl: String(data.photoUrl ?? ""),
        role: String(data.role ?? ""),
        disabled: Boolean(data.disabled),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/** @param {string} search @param {string} currentUid @returns {Promise<MessagingDirectoryEntry[]>} */
export async function searchMessagingDirectory(search, currentUid) {
  const term = search.trim().toLowerCase();
  const rows = await listMessagingDirectory();
  return rows.filter((entry) => {
    if (entry.uid === currentUid) return false;
    if (!term) return true;
    return (
      entry.displayName.toLowerCase().includes(term) ||
      entry.email.toLowerCase().includes(term)
    );
  });
}
