import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase.js";
import { ALL_ROLES, ROLES } from "./roles.js";

/** @typedef {'admin' | 'student' | 'instructor' | 'department' | 'certification'} PortalType */

/**
 * @typedef {Object} PortalRoleDefinition
 * @property {string} id
 * @property {string} label
 * @property {string} description
 * @property {PortalType} portalType
 * @property {'active' | 'archived'} status
 */

export const PORTAL_TYPE_OPTIONS = [
  { value: "admin", label: "Admin portal (/admin)" },
  { value: "student", label: "Student portal (/student)" },
  { value: "instructor", label: "Instructor portal (/instructor)" },
  { value: "department", label: "Department portal (/department)" },
  { value: "certification", label: "Certification portal (/certification)" },
];

const SYSTEM_ROLE_IDS = new Set(ALL_ROLES);

/** @param {string} roleId */
export function normalizeRoleId(roleId) {
  return String(roleId ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** @param {string} roleId */
export function isSystemRoleId(roleId) {
  return SYSTEM_ROLE_IDS.has(roleId);
}

/** @param {string} roleId */
export function validateCustomRoleId(roleId) {
  const id = normalizeRoleId(roleId);
  if (!id) throw new Error("Role id is required.");
  if (id.length < 2 || id.length > 48) throw new Error("Role id must be 2–48 characters.");
  if (isSystemRoleId(id)) throw new Error("That id is reserved for a built-in system role.");
  if (!/^[a-z][a-z0-9_]*$/.test(id)) {
    throw new Error("Role id must start with a letter and use lowercase letters, numbers, or underscores.");
  }
  return id;
}

/** @returns {Promise<PortalRoleDefinition[]>} */
export async function listPortalRoleDefinitions() {
  const snap = await getDocs(collection(db, "portalRoleDefinitions"));
  return snap.docs
    .map((item) => normalizeDefinition(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** @param {string} roleId @returns {Promise<PortalRoleDefinition | null>} */
export async function getPortalRoleDefinition(roleId) {
  const id = normalizeRoleId(roleId);
  if (!id || isSystemRoleId(id)) return null;
  const snap = await getDoc(doc(db, "portalRoleDefinitions", id));
  if (!snap.exists()) return null;
  return normalizeDefinition(snap.id, snap.data());
}

/** @param {string} id @param {Record<string, unknown>} data @returns {PortalRoleDefinition | null} */
function normalizeDefinition(id, data) {
  const portalType = String(data.portalType ?? "admin");
  const validPortal = PORTAL_TYPE_OPTIONS.some((option) => option.value === portalType);
  if (!validPortal) return null;
  return {
    id,
    label: String(data.label ?? id),
    description: String(data.description ?? ""),
    portalType,
    status: data.status === "archived" ? "archived" : "active",
  };
}

/**
 * @param {string} roleId
 * @param {{ label: string, description?: string, portalType: PortalType, status?: 'active' | 'archived' }} input
 * @param {string} userId
 */
export async function savePortalRoleDefinition(roleId, input, userId) {
  const id = validateCustomRoleId(roleId);
  const ref = doc(db, "portalRoleDefinitions", id);
  const existing = await getDoc(ref);
  await setDoc(ref, {
    label: String(input.label ?? id).trim(),
    description: String(input.description ?? "").trim(),
    portalType: input.portalType,
    status: input.status === "archived" ? "archived" : "active",
    updatedAt: serverTimestamp(),
    updatedBy: userId,
    ...(existing.exists()
      ? {}
      : {
          createdAt: serverTimestamp(),
          createdBy: userId,
        }),
  }, { merge: true });
  return id;
}

/** @param {string} roleId */
export async function archivePortalRoleDefinition(roleId) {
  const id = normalizeRoleId(roleId);
  if (!id || isSystemRoleId(id)) return;
  await setDoc(
    doc(db, "portalRoleDefinitions", id),
    { status: "archived", updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/** @param {string} roleId */
export async function deletePortalRoleDefinition(roleId) {
  const id = normalizeRoleId(roleId);
  if (!id || isSystemRoleId(id)) return;
  await deleteDoc(doc(db, "portalRoleDefinitions", id));
}

/** @param {PortalRoleDefinition[]} customRoles */
export function customRolesById(customRoles) {
  return Object.fromEntries(customRoles.map((role) => [role.id, role]));
}

/** @param {string | null | undefined} role @param {Record<string, PortalRoleDefinition>} customById */
export function isActiveKnownRole(role, customById = {}) {
  if (!role) return false;
  if (isSystemRoleId(role)) return true;
  return customById[role]?.status === "active";
}
