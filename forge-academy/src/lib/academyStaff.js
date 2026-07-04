import { ROLES } from "./roles.js";
import { isSystemRoleId } from "./portalRoleDefinitions.js";
import { listAllPortalUsers } from "./users.js";
import { listInstructors, instructorDisplayName, INSTRUCTOR_STATUSES } from "./instructors.js";

/** @typedef {import('./users.js').AppUserRecord} AppUserRecord */
/** @typedef {import('./instructors.js').InstructorRecord} InstructorRecord */

/** @type {Set<string>} */
const ACADEMY_STAFF_SYSTEM_ROLES = new Set([
  ROLES.INSTRUCTOR,
  ROLES.ACADEMY_ADMIN,
  ROLES.CERTIFICATION_OFFICER,
  ROLES.SUPER_ADMIN,
  ROLES.CREATOR,
]);

/** @type {Set<string>} */
const ACADEMY_STAFF_PORTAL_TYPES = new Set(["admin", "instructor", "certification"]);

/**
 * @param {AppUserRecord | null | undefined} user
 * @param {Record<string, import('./portalRoleDefinitions.js').PortalRoleDefinition>} [customById]
 */
export function isAcademyStaffUser(user, customById = {}) {
  if (!user || user.disabled) return false;
  if (ACADEMY_STAFF_SYSTEM_ROLES.has(user.role)) return true;

  if (!isSystemRoleId(user.role)) {
    const custom = customById[user.role];
    if (custom?.status === "active" && ACADEMY_STAFF_PORTAL_TYPES.has(custom.portalType)) {
      return true;
    }
  }

  return Boolean(user.jobTitle || user.staffSlug || user.organizationUnit);
}

/**
 * @typedef {Object} AcademyStaffRecord
 * @property {string} id
 * @property {string} displayName
 * @property {string} email
 * @property {string} role
 * @property {string} jobTitle
 * @property {string} phone
 * @property {string[]} departmentIds
 * @property {string} [userId]
 * @property {string} [instructorId]
 * @property {string} [instructorStatus]
 * @property {string} source
 */

/**
 * @param {Record<string, import('./portalRoleDefinitions.js').PortalRoleDefinition>} [customById]
 * @returns {Promise<AcademyStaffRecord[]>}
 */
export async function listAcademyStaff(customById = {}) {
  const [users, instructors] = await Promise.all([listAllPortalUsers(), listInstructors()]);
  const instructorByUserId = new Map(
    instructors.filter((item) => item.userId).map((item) => [item.userId, item]),
  );
  const seenInstructorIds = new Set();
  const rows = [];

  for (const user of users) {
    if (!isAcademyStaffUser(user, customById)) continue;
    const instructor = instructorByUserId.get(user.uid);
    if (instructor) seenInstructorIds.add(instructor.id);
    rows.push({
      id: user.uid,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      jobTitle: user.jobTitle ?? "",
      phone: user.phone ?? "",
      departmentIds: user.departmentIds ?? [],
      userId: user.uid,
      instructorId: instructor?.id,
      instructorStatus: instructor?.status,
      source: "portal_user",
    });
  }

  for (const instructor of instructors) {
    if (seenInstructorIds.has(instructor.id)) continue;
    if (instructor.status === INSTRUCTOR_STATUSES.INACTIVE) continue;
    rows.push({
      id: instructor.id,
      displayName: instructorDisplayName(instructor),
      email: instructor.email,
      role: ROLES.INSTRUCTOR,
      jobTitle: instructor.bio ?? "",
      phone: instructor.phone ?? "",
      departmentIds: instructor.departmentIds ?? [],
      userId: instructor.userId || undefined,
      instructorId: instructor.id,
      instructorStatus: instructor.status,
      source: "instructor_only",
    });
  }

  return rows.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * @param {Record<string, import('./portalRoleDefinitions.js').PortalRoleDefinition>} [customById]
 * @returns {Promise<number>}
 */
export async function countActiveAcademyStaff(customById = {}) {
  const staff = await listAcademyStaff(customById);
  return staff.filter((entry) => entry.instructorStatus !== INSTRUCTOR_STATUSES.INACTIVE).length;
}

/**
 * @param {AcademyStaffRecord[]} staff
 * @param {string} search
 * @param {Record<string, { name?: string, fdid?: string }>} [departmentsById]
 */
export function filterAcademyStaff(staff, search, departmentsById = {}) {
  const term = search.trim().toLowerCase();
  if (!term) return staff;

  return staff.filter((member) => {
    const departmentText = member.departmentIds
      .map((id) => {
        const department = departmentsById[id];
        return department ? `${department.name} ${department.fdid ?? ""}` : id;
      })
      .join(" ");

    return [member.displayName, member.email, member.phone, member.jobTitle, member.role, departmentText]
      .join(" ")
      .toLowerCase()
      .includes(term);
  });
}
