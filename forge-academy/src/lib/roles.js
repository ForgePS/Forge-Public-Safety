/** @typedef {import('./roles.js').Role} Role */

export const ROLES = {
  STUDENT: "student",
  DEPARTMENT: "department_training_officer",
  INSTRUCTOR: "instructor",
  ACADEMY_ADMIN: "academy_admin",
  CERTIFICATION_OFFICER: "certification_officer",
  SUPER_ADMIN: "super_admin",
  CREATOR: "creator",
};

/** @type {Record<Role, string>} */
export const ROLE_LABELS = {
  [ROLES.STUDENT]: "Student",
  [ROLES.DEPARTMENT]: "Department Training Officer",
  [ROLES.INSTRUCTOR]: "Instructor",
  [ROLES.ACADEMY_ADMIN]: "Academy Admin",
  [ROLES.CERTIFICATION_OFFICER]: "Certification Officer",
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.CREATOR]: "Creator",
};

/** @type {Record<Role, string>} */
export const ROLE_HOME_PATHS = {
  [ROLES.STUDENT]: "/student",
  [ROLES.DEPARTMENT]: "/department",
  [ROLES.INSTRUCTOR]: "/instructor",
  [ROLES.ACADEMY_ADMIN]: "/admin",
  [ROLES.CERTIFICATION_OFFICER]: "/certification",
  [ROLES.SUPER_ADMIN]: "/admin",
  [ROLES.CREATOR]: "/admin",
};

/** @type {Role[]} */
export const ALL_ROLES = Object.values(ROLES);

/** Roles that can edit global system settings. */
export const SYSTEM_SETTINGS_ROLES = [ROLES.CREATOR, ROLES.SUPER_ADMIN];

/**
 * @param {Role | null | undefined} role
 */
export function isSystemSettingsAdmin(role) {
  return Boolean(role && SYSTEM_SETTINGS_ROLES.includes(role));
}

/**
 * @param {Role | null | undefined} role
 */
export function isFullAdmin(role) {
  return (
    role === ROLES.CREATOR ||
    role === ROLES.SUPER_ADMIN ||
    role === ROLES.ACADEMY_ADMIN
  );
}

/** Roles that can access the academy admin portal. */
export const ADMIN_PORTAL_ROLES = [ROLES.ACADEMY_ADMIN, ROLES.SUPER_ADMIN, ROLES.CREATOR];

/**
 * @param {Role | null | undefined} role
 * @param {Role | Role[]} allowed
 */
export function roleAllowed(role, allowed) {
  if (!role) return false;
  const list = Array.isArray(allowed) ? allowed : [allowed];
  if (list.includes(role)) return true;
  if (isFullAdmin(role)) {
    return list.some((item) => ADMIN_PORTAL_ROLES.includes(item));
  }
  return false;
}

/** @type {{ prefix: string, roles: Role[] }[]} */
const PATH_ROLE_PREFIXES = [
  { prefix: "/admin", roles: [ROLES.ACADEMY_ADMIN, ROLES.SUPER_ADMIN, ROLES.CREATOR] },
  { prefix: "/student", roles: [ROLES.STUDENT] },
  { prefix: "/department", roles: [ROLES.DEPARTMENT] },
  { prefix: "/instructor", roles: [ROLES.INSTRUCTOR] },
  { prefix: "/certification", roles: [ROLES.CERTIFICATION_OFFICER] },
];

/**
 * @param {Role | null | undefined} role
 * @param {string} pathname
 */
export function pathAllowedForRole(role, pathname) {
  if (!role || !pathname) return false;
  if (pathname.startsWith("/verify/")) return true;

  for (const { prefix, roles } of PATH_ROLE_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      if (isFullAdmin(role)) {
        return prefix === "/admin";
      }
      return roles.includes(role);
    }
  }

  return pathname === "/" || pathname === "/login";
}

/**
 * @param {Role | null | undefined} role
 */
export function homePathForRole(role) {
  if (!role) return "/login";
  return ROLE_HOME_PATHS[role] ?? "/login";
}
