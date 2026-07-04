import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import {
  canAssignPortalRole,
  canManagePortalUserWithRole,
} from "./roles.js";
import { getPortalUserErrorMessage, updatePortalUser } from "./portalUsers.js";

/** @param {unknown} error */
function isFunctionsUnavailable(error) {
  const message = getPortalUserErrorMessage(error).toLowerCase();
  return (
    message.includes("internal") ||
    message.includes("unavailable") ||
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("deadline")
  );
}

/**
 * Update portal user profile fields directly in Firestore (admin rules).
 * Use when Cloud Functions are unavailable; does not update Firebase Auth.
 * @param {string} uid
 * @param {Record<string, unknown>} patch
 */
export async function updatePortalUserProfileDirect(uid, patch) {
  await setDoc(
    doc(db, "users", uid),
    {
      ...patch,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * Change a portal user's role from the admin UI.
 * @param {import('./roles.js').Role | null | undefined} callerRole
 * @param {import('./users.js').AppUserRecord} targetUser
 * @param {import('./roles.js').Role} newRole
 */
export async function savePortalUserRole(callerRole, targetUser, newRole) {
  if (!canAssignPortalRole(callerRole, newRole)) {
    throw new Error("You do not have permission to assign that role.");
  }
  if (!canManagePortalUserWithRole(callerRole, targetUser.role)) {
    throw new Error("You do not have permission to manage this user.");
  }
  if (targetUser.role === newRole) return;

  const payload = {
    uid: targetUser.uid,
    displayName: targetUser.displayName,
    role: newRole,
    departmentId: targetUser.departmentId ?? "",
    studentId: targetUser.studentId ?? "",
    disabled: Boolean(targetUser.disabled),
    jobTitle: targetUser.jobTitle ?? "",
    phone: targetUser.phone ?? "",
    phoneExtension: targetUser.phoneExtension ?? "",
    photoUrl: targetUser.photoUrl ?? "",
    profileUrl: targetUser.profileUrl ?? "",
    organizationUnit: targetUser.organizationUnit ?? "",
    staffSlug: targetUser.staffSlug ?? "",
  };

  try {
    await updatePortalUser(payload);
  } catch (error) {
    if (!isFunctionsUnavailable(error)) {
      throw new Error(getPortalUserErrorMessage(error));
    }
    await updatePortalUserProfileDirect(targetUser.uid, { role: newRole });
  }
}

/**
 * @param {import('./roles.js').Role | null | undefined} callerRole
 * @param {Record<string, unknown>} input
 */
export async function savePortalUserProfile(callerRole, input) {
  try {
    await updatePortalUser(input);
  } catch (error) {
    if (!isFunctionsUnavailable(error)) {
      throw new Error(getPortalUserErrorMessage(error));
    }

    const { uid, ...patch } = input;
    if (!uid) throw new Error("User id is required.");

    const targetRole = typeof input.role === "string" ? input.role : undefined;
    if (targetRole && !canAssignPortalRole(callerRole, targetRole)) {
      throw new Error("You do not have permission to assign that role.");
    }

    await updatePortalUserProfileDirect(String(uid), patch);
  }
}

/**
 * @param {import('./roles.js').Role | null | undefined} role
 */
export function canManagePortalUsers(role) {
  return role === "academy_admin" || role === "super_admin" || role === "creator";
}
