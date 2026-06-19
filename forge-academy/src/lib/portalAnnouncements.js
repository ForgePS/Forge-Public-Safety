import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase.js";
import { ROLES } from "./roles.js";

export const PORTAL_AUDIENCES = {
  ADMIN: "admin",
  STUDENT: "student",
  INSTRUCTOR: "instructor",
  DEPARTMENT: "department",
  CERTIFICATION: "certification",
};

/** @type {{ value: string, label: string }[]} */
export const PORTAL_AUDIENCE_OPTIONS = [
  { value: PORTAL_AUDIENCES.ADMIN, label: "Admin portal" },
  { value: PORTAL_AUDIENCES.STUDENT, label: "Student portal" },
  { value: PORTAL_AUDIENCES.INSTRUCTOR, label: "Instructor portal" },
  { value: PORTAL_AUDIENCES.DEPARTMENT, label: "Department portal" },
  { value: PORTAL_AUDIENCES.CERTIFICATION, label: "Certification portal" },
];

/** Audiences instructors may publish to. */
export const INSTRUCTOR_ANNOUNCEMENT_AUDIENCES = [
  PORTAL_AUDIENCES.STUDENT,
  PORTAL_AUDIENCES.INSTRUCTOR,
];

/** @type {{ value: string, label: string }[]} */
export const INSTRUCTOR_ANNOUNCEMENT_AUDIENCE_OPTIONS = PORTAL_AUDIENCE_OPTIONS.filter((item) =>
  INSTRUCTOR_ANNOUNCEMENT_AUDIENCES.includes(item.value),
);

const announcementsRef = collection(db, "portalAnnouncements");

/**
 * @typedef {Object} PortalAnnouncementRecord
 * @property {string} id
 * @property {string} title
 * @property {string} detail
 * @property {boolean} active
 * @property {string[]} audiences
 * @property {string} createdByUid
 * @property {string} createdByName
 * @property {import('firebase/firestore').Timestamp | null} publishedAt
 * @property {import('firebase/firestore').Timestamp | null} createdAt
 * @property {import('firebase/firestore').Timestamp | null} updatedAt
 */

/**
 * @param {import('./roles.js').Role | null | undefined} role
 * @returns {string | null}
 */
export function roleToPortalAudience(role) {
  if (!role) return null;
  if (
    role === ROLES.ACADEMY_ADMIN ||
    role === ROLES.SUPER_ADMIN ||
    role === ROLES.CREATOR
  ) {
    return PORTAL_AUDIENCES.ADMIN;
  }
  if (role === ROLES.STUDENT) return PORTAL_AUDIENCES.STUDENT;
  if (role === ROLES.INSTRUCTOR) return PORTAL_AUDIENCES.INSTRUCTOR;
  if (role === ROLES.DEPARTMENT) return PORTAL_AUDIENCES.DEPARTMENT;
  if (role === ROLES.CERTIFICATION_OFFICER) return PORTAL_AUDIENCES.CERTIFICATION;
  return null;
}

/**
 * @param {string} id
 * @param {unknown} data
 * @returns {PortalAnnouncementRecord | null}
 */
export function mapPortalAnnouncement(id, data) {
  if (!data || typeof data !== "object") return null;
  const audiences = Array.isArray(data.audiences)
    ? data.audiences.filter((item) => typeof item === "string")
    : [];
  return {
    id,
    title: data.title ?? "",
    detail: data.detail ?? "",
    active: data.active !== false,
    audiences,
    createdByUid: data.createdByUid ?? "",
    createdByName: data.createdByName ?? "",
    publishedAt: data.publishedAt ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

/** @returns {Promise<PortalAnnouncementRecord[]>} */
async function listPortalAnnouncementsOrdered() {
  const snap = await getDocs(query(announcementsRef, orderBy("publishedAt", "desc")));
  return snap.docs
    .map((item) => mapPortalAnnouncement(item.id, item.data()))
    .filter(Boolean);
}

/**
 * Audience-scoped query so non-admin users only request documents they can read.
 * @param {string} audience
 * @returns {Promise<PortalAnnouncementRecord[]>}
 */
async function listPortalAnnouncementsForAudienceQuery(audience) {
  const snap = await getDocs(
    query(announcementsRef, where("audiences", "array-contains", audience)),
  );
  return snap.docs
    .map((item) => mapPortalAnnouncement(item.id, item.data()))
    .filter(Boolean)
    .sort((a, b) => {
      const aTime = a.publishedAt?.toMillis?.() ?? 0;
      const bTime = b.publishedAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
}

/**
 * @param {{ audience?: string | null, activeOnly?: boolean, limit?: number }} [options]
 * @returns {Promise<PortalAnnouncementRecord[]>}
 */
export async function listPortalAnnouncements(options = {}) {
  const { audience = null, activeOnly = false, limit = null } = options;
  let rows = audience
    ? await listPortalAnnouncementsForAudienceQuery(audience)
    : await listPortalAnnouncementsOrdered();
  if (activeOnly) {
    rows = rows.filter((item) => item.active);
  }
  if (typeof limit === "number" && limit > 0) {
    rows = rows.slice(0, limit);
  }
  return rows;
}

/** @returns {Promise<PortalAnnouncementRecord[]>} */
export function listAllPortalAnnouncements() {
  return listPortalAnnouncements();
}

/**
 * @param {import('./roles.js').Role | null | undefined} role
 * @param {{ limit?: number }} [options]
 * @returns {Promise<PortalAnnouncementRecord[]>}
 */
export function listPortalAnnouncementsForRole(role, options = {}) {
  const audience = roleToPortalAudience(role);
  if (!audience) return Promise.resolve([]);
  return listPortalAnnouncements({ audience, activeOnly: true, ...options });
}

/** @param {string} id */
export async function getPortalAnnouncement(id) {
  const snap = await getDoc(doc(db, "portalAnnouncements", id));
  if (!snap.exists()) return null;
  return mapPortalAnnouncement(snap.id, snap.data());
}

/**
 * @param {import('firebase/firestore').Timestamp | null | undefined} timestamp
 */
export function formatAnnouncementDate(timestamp) {
  if (!timestamp?.toDate) return "";
  return timestamp.toDate().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * @param {string | Date | null | undefined} value
 */
function toPublishedTimestamp(value) {
  if (!value) return serverTimestamp();
  const date = value instanceof Date ? value : new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return serverTimestamp();
  return date;
}

/** @param {string[]} audiences */
export function isInstructorManagedAudienceList(audiences) {
  if (!Array.isArray(audiences) || audiences.length === 0) return false;
  const allowed = new Set(INSTRUCTOR_ANNOUNCEMENT_AUDIENCES);
  return audiences.every((item) => allowed.has(item));
}

/** @param {PortalAnnouncementRecord} item @param {string | null | undefined} uid */
export function canInstructorEditAnnouncement(item, uid) {
  return Boolean(uid) && isInstructorManagedAudienceList(item.audiences) && item.createdByUid === uid;
}

/** @returns {Promise<PortalAnnouncementRecord[]>} */
export async function listInstructorManagedAnnouncements(uid) {
  const [studentRows, instructorRows] = await Promise.all([
    listPortalAnnouncements({ audience: PORTAL_AUDIENCES.STUDENT }),
    listPortalAnnouncements({ audience: PORTAL_AUDIENCES.INSTRUCTOR }),
  ]);
  const merged = new Map();
  for (const item of [...studentRows, ...instructorRows]) {
    if (canInstructorEditAnnouncement(item, uid)) {
      merged.set(item.id, item);
    }
  }
  return [...merged.values()].sort((a, b) => {
    const aTime = a.publishedAt?.toMillis?.() ?? 0;
    const bTime = b.publishedAt?.toMillis?.() ?? 0;
    return bTime - aTime;
  });
}

/**
 * @param {import('./roles.js').Role | null | undefined} role
 * @returns {string | null}
 */
export function manageAnnouncementsPathForRole(role) {
  if (!role) return null;
  if (
    role === ROLES.ACADEMY_ADMIN ||
    role === ROLES.SUPER_ADMIN ||
    role === ROLES.CREATOR
  ) {
    return "/admin/announcements";
  }
  if (role === ROLES.INSTRUCTOR) return "/instructor/announcements";
  return null;
}

/** @returns {{ title: string, detail: string, active: boolean, audiences: string[], publishedAt: string }} */
export function defaultPortalAnnouncementForm(audiences = [PORTAL_AUDIENCES.ADMIN]) {
  return {
    title: "",
    detail: "",
    active: true,
    audiences: [...audiences],
    publishedAt: new Date().toISOString().slice(0, 10),
  };
}

/**
 * @param {ReturnType<typeof defaultPortalAnnouncementForm>} form
 * @param {string | null | undefined} [id]
 * @param {{ allowedAudiences?: string[], author?: { uid: string, displayName: string } | null }} [options]
 */
export async function savePortalAnnouncement(form, id = null, options = {}) {
  const { allowedAudiences = null, author = null } = options;
  const title = form.title.trim();
  if (!title) {
    throw new Error("Announcement title is required.");
  }
  let audiences = Array.isArray(form.audiences)
    ? [...new Set(form.audiences.filter(Boolean))]
    : [];
  if (allowedAudiences) {
    audiences = audiences.filter((item) => allowedAudiences.includes(item));
  }
  if (audiences.length === 0) {
    throw new Error("Select at least one portal audience.");
  }

  const payload = {
    title,
    detail: form.detail.trim(),
    active: form.active !== false,
    audiences,
    publishedAt: toPublishedTimestamp(form.publishedAt),
    updatedAt: serverTimestamp(),
  };

  if (id) {
    await updateDoc(doc(db, "portalAnnouncements", id), payload);
    return id;
  }

  const docRef = await addDoc(announcementsRef, {
    ...payload,
    createdByUid: author?.uid ?? "",
    createdByName: author?.displayName ?? "",
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/** @param {string} id */
export async function deletePortalAnnouncement(id) {
  await deleteDoc(doc(db, "portalAnnouncements", id));
}

/** @param {string} audience */
export function portalAudienceLabel(audience) {
  return PORTAL_AUDIENCE_OPTIONS.find((item) => item.value === audience)?.label ?? audience;
}
