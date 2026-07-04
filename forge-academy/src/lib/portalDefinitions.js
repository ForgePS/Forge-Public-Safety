import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase.js";

/** @typedef {'active' | 'archived'} PortalDefinitionStatus */

/**
 * @typedef {Object} PortalDefinition
 * @property {string} slug
 * @property {string} label
 * @property {string} description
 * @property {boolean} enabled
 * @property {string} signInMessage
 * @property {PortalDefinitionStatus} status
 */

export const BUILTIN_PORTAL_SLUGS = new Set([
  "admin",
  "student",
  "department",
  "instructor",
  "certification",
]);

export const RESERVED_PORTAL_SLUGS = new Set([
  ...BUILTIN_PORTAL_SLUGS,
  "login",
  "verify",
  "unauthorized",
  "display",
]);

/** @param {string} slug */
export function normalizePortalSlug(slug) {
  return String(slug ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** @param {string} slug */
export function portalPathFromSlug(slug) {
  return `/${normalizePortalSlug(slug)}`;
}

/** @param {string} slug */
export function isBuiltinPortalSlug(slug) {
  return BUILTIN_PORTAL_SLUGS.has(normalizePortalSlug(slug));
}

/** @param {string} pathname @returns {string | null} */
export function definedPortalSlugFromPath(pathname) {
  const clean = pathname.split("?")[0].split("#")[0];
  const match = clean.match(/^\/([^/]+)/);
  if (!match) return null;
  const slug = match[1];
  if (RESERVED_PORTAL_SLUGS.has(slug)) return null;
  return slug;
}

/** @param {string} slug */
export function validatePortalSlug(slug) {
  const normalized = normalizePortalSlug(slug);
  if (!normalized) throw new Error("Portal slug is required.");
  if (normalized.length < 2 || normalized.length > 48) {
    throw new Error("Portal slug must be 2–48 characters.");
  }
  if (RESERVED_PORTAL_SLUGS.has(normalized)) {
    throw new Error("That slug is reserved for a built-in portal or system route.");
  }
  if (!/^[a-z][a-z0-9_]*$/.test(normalized)) {
    throw new Error("Portal slug must start with a letter and use lowercase letters, numbers, or underscores.");
  }
  return normalized;
}

/** @param {string} slug @param {Record<string, unknown>} data @returns {PortalDefinition | null} */
function normalizePortalDefinition(slug, data) {
  if (!slug) return null;
  return {
    slug,
    label: String(data.label ?? slug),
    description: String(data.description ?? ""),
    enabled: data.enabled !== false,
    signInMessage: String(data.signInMessage ?? ""),
    status: data.status === "archived" ? "archived" : "active",
  };
}

/** @returns {Promise<PortalDefinition[]>} */
export async function listPortalDefinitions() {
  const snap = await getDocs(collection(db, "portalDefinitions"));
  return snap.docs
    .map((item) => normalizePortalDefinition(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** @param {string} slug @returns {Promise<PortalDefinition | null>} */
export async function getPortalDefinition(slug) {
  const normalized = normalizePortalSlug(slug);
  if (!normalized) return null;
  const snap = await getDoc(doc(db, "portalDefinitions", normalized));
  if (!snap.exists()) return null;
  return normalizePortalDefinition(snap.id, snap.data());
}

/**
 * @param {string} slug
 * @param {{ label: string, description?: string, enabled?: boolean, signInMessage?: string, status?: PortalDefinitionStatus }} input
 * @param {string} userId
 */
export async function savePortalDefinition(slug, input, userId) {
  const normalized = validatePortalSlug(slug);
  const ref = doc(db, "portalDefinitions", normalized);
  const existing = await getDoc(ref);
  await setDoc(
    ref,
    {
      label: String(input.label ?? normalized).trim(),
      description: String(input.description ?? "").trim(),
      enabled: input.enabled !== false,
      signInMessage: String(input.signInMessage ?? "").trim(),
      status: input.status === "archived" ? "archived" : "active",
      updatedAt: serverTimestamp(),
      updatedBy: userId,
      ...(existing.exists()
        ? {}
        : {
            createdAt: serverTimestamp(),
            createdBy: userId,
          }),
    },
    { merge: true },
  );
  return normalized;
}

/** @param {string} slug */
export async function archivePortalDefinition(slug) {
  const normalized = normalizePortalSlug(slug);
  if (!normalized) return;
  await setDoc(
    doc(db, "portalDefinitions", normalized),
    { status: "archived", updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/** @param {string} slug */
export async function deletePortalDefinition(slug) {
  const normalized = normalizePortalSlug(slug);
  if (!normalized) return;
  await deleteDoc(doc(db, "portalDefinitions", normalized));
}

/** @param {PortalDefinition[]} portals */
export function portalDefinitionsBySlug(portals) {
  return Object.fromEntries(portals.map((portal) => [portal.slug, portal]));
}

/** @deprecated Use portalPathFromSlug */
export function customPortalPath(slug) {
  return portalPathFromSlug(slug);
}

/** @deprecated Use definedPortalSlugFromPath */
export function customPortalSlugFromPath(pathname) {
  return definedPortalSlugFromPath(pathname);
}
