import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import { ROLES } from "./roles.js";
import { getPortalRoleDefinition, isSystemRoleId } from "./portalRoleDefinitions.js";

/**
 * @typedef {Object} AppUserRecord
 * @property {string} uid
 * @property {string} email
 * @property {string} displayName
 * @property {import('./roles.js').Role} role
 * @property {string} [departmentId]
 * @property {string} [studentId]
 * @property {boolean} [disabled]
 * @property {string} [jobTitle]
 * @property {string} [phone]
 * @property {string} [phoneExtension]
 * @property {string} [photoUrl]
 * @property {string} [profileUrl]
 * @property {string} [organizationUnit]
 * @property {string} [staffSlug]
 * @property {{ digitalDashboard?: Record<string, { view?: boolean, edit?: boolean }> }} [permissions]
 */

/**
 * @param {string} uid
 * @returns {Promise<AppUserRecord | null>}
 */
export async function fetchUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return fetchUserProfileFromSnap(uid, snap.data());
}

/** @param {string} uid @param {Record<string, unknown>} data */
async function fetchUserProfileFromSnap(uid, data) {
  const role = data.role;

  if (!isSystemRoleId(role)) {
    const custom = await getPortalRoleDefinition(String(role));
    if (!custom || custom.status !== "active") {
      return null;
    }
  } else if (!Object.values(ROLES).includes(role)) {
    return null;
  }

  return {
    uid,
    email: data.email ?? "",
    displayName: data.displayName ?? "",
    role,
    departmentId: data.departmentId,
    studentId: data.studentId,
    disabled: Boolean(data.disabled),
    jobTitle: data.jobTitle ?? "",
    phone: data.phone ?? "",
    phoneExtension: data.phoneExtension ?? "",
    photoUrl: data.photoUrl ?? "",
    profileUrl: data.profileUrl ?? "",
    organizationUnit: data.organizationUnit ?? "",
    staffSlug: data.staffSlug ?? "",
    permissions: data.permissions ?? undefined,
  };
}

/**
 * First authenticated user with no profile can bootstrap as academy admin.
 * Only works when no users/{uid} doc exists yet and Firestore rules allow it.
 * @param {import('firebase/auth').User} firebaseUser
 * @returns {Promise<AppUserRecord | null>}
 */
export async function tryBootstrapAdminProfile(firebaseUser) {
  const userRef = doc(db, "users", firebaseUser.uid);
  const existing = await getDoc(userRef);
  if (existing.exists()) {
    return fetchUserProfile(firebaseUser.uid);
  }

  try {
    await setDoc(userRef, {
      email: firebaseUser.email ?? "",
      displayName:
        firebaseUser.displayName?.trim() ||
        firebaseUser.email?.split("@")[0] ||
        "Academy Admin",
      role: ROLES.ACADEMY_ADMIN,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Another in-flight request may have created the profile first.
  }

  return fetchUserProfile(firebaseUser.uid);
}

/** @returns {Promise<AppUserRecord[]>} */
export async function listAllPortalUsers() {
  const snap = await getDocs(collection(db, "users"));
  const profiles = await Promise.all(
    snap.docs.map((item) => fetchUserProfileFromSnap(item.id, item.data())),
  );
  return profiles.filter(Boolean).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/** @returns {Promise<AppUserRecord[]>} */
export async function listInstructors() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs
    .map((item) => {
      const data = item.data();
      if (data.role !== ROLES.INSTRUCTOR) return null;
      return {
        uid: item.id,
        email: data.email ?? "",
        displayName: data.displayName ?? "",
        role: ROLES.INSTRUCTOR,
        departmentId: data.departmentId,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/** @returns {Promise<AppUserRecord[]>} */
export async function listUsersByRole(role) {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs
    .map((item) => {
      const data = item.data();
      if (data.role !== role) return null;
      return {
        uid: item.id,
        email: data.email ?? "",
        displayName: data.displayName ?? "",
        role: data.role,
        departmentId: data.departmentId,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
