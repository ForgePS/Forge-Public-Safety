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
export const SYSTEM_SETTINGS_ROLES = [ROLES.CREATOR, ROLES.SUPER_ADMIN, ROLES.ACADEMY_ADMIN];

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

/** Roles that can assign any portal role (including creator and super admin). */
export const PORTAL_ROLE_MANAGERS = [ROLES.SUPER_ADMIN, ROLES.CREATOR];

/**
 * @param {Role | null | undefined} role
 */
export function isCreator(role) {
  return role === ROLES.CREATOR;
}

/**
 * @param {Role | null | undefined} role
 */
export function isSuperAdmin(role) {
  return role === ROLES.SUPER_ADMIN;
}

/**
 * @param {Role | null | undefined} role
 */
export function canManageAllPortalRoles(role) {
  return Boolean(role && PORTAL_ROLE_MANAGERS.includes(role));
}

/**
 * @param {Role | null | undefined} role
 */
export function canManagePortalRoleDefinitions(role) {
  return isFullAdmin(role);
}

/**
 * @param {Role | null | undefined} role
 */
export function canManageAdminPortalAccessRoles(role) {
  return canManageAllPortalRoles(role);
}

/**
 * @param {Role | null | undefined} callerRole
 * @param {import('./portalRoleDefinitions.js').PortalType | string} portalType
 */
export function canManagePortalAccessRoleType(callerRole, portalType) {
  if (!callerRole) return false;
  if (canManageAllPortalRoles(callerRole)) return true;
  if (callerRole === ROLES.ACADEMY_ADMIN) return portalType !== "admin";
  return false;
}

/**
 * @param {Role | null | undefined} callerRole
 * @param {import('./portalRoleDefinitions.js').PortalRoleDefinition | null | undefined} [definition]
 */
export function canEditPortalRoleDefinition(callerRole, definition) {
  if (!canManagePortalRoleDefinitions(callerRole)) return false;
  if (!definition) return true;
  return canManagePortalAccessRoleType(callerRole, definition.portalType);
}

/**
 * @param {Role | null | undefined} callerRole
 * @param {Role | string} targetRole
 * @param {Record<string, import('./portalRoleDefinitions.js').PortalRoleDefinition>} [customById]
 */
export function canAssignPortalRole(callerRole, targetRole, customById = {}) {
  if (!callerRole) return false;
  const isCustom = !ALL_ROLES.includes(String(targetRole));
  const custom = customById[String(targetRole)];
  if (isCustom && (!custom || custom.status !== "active")) return false;

  if (canManageAllPortalRoles(callerRole)) return true;
  if (callerRole === ROLES.ACADEMY_ADMIN) {
    if (targetRole === ROLES.CREATOR || targetRole === ROLES.SUPER_ADMIN) return false;
    if (isCustom && custom?.portalType === "admin") return false;
    return !isCustom || Boolean(custom);
  }
  return false;
}

/**
 * @param {Role | null | undefined} callerRole
 * @param {Role | null | undefined} targetUserRole
 * @param {Record<string, import('./portalRoleDefinitions.js').PortalRoleDefinition>} [customById]
 */
export function canManagePortalUserWithRole(callerRole, targetUserRole, customById = {}) {
  if (!callerRole || !targetUserRole) return false;
  if (canManageAllPortalRoles(callerRole)) return true;
  if (callerRole === ROLES.ACADEMY_ADMIN) {
    if (targetUserRole === ROLES.CREATOR || targetUserRole === ROLES.SUPER_ADMIN) return false;
    if (customById[targetUserRole]?.portalType === "admin") return false;
    return true;
  }
  return false;
}

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
 * @param {Record<string, import('./portalRoleDefinitions.js').PortalRoleDefinition>} [customById]
 */
export function pathAllowedForRole(role, pathname, customById = {}) {
  if (!role || !pathname) return false;
  if (pathname.startsWith("/verify/")) return true;

  const custom = customById[role];
  if (custom?.status === "active") {
    const prefixByPortalType = {
      admin: "/admin",
      student: "/student",
      instructor: "/instructor",
      department: "/department",
      certification: "/certification",
    };
    const prefix = prefixByPortalType[custom.portalType];
    if (prefix && (pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      return true;
    }
  }

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
 * @param {Record<string, import('./portalRoleDefinitions.js').PortalRoleDefinition>} [customById]
 */
export function homePathForRole(role, customById = {}) {
  if (!role) return "/login";
  if (ROLE_HOME_PATHS[role]) return ROLE_HOME_PATHS[role];
  const custom = customById[role];
  if (!custom || custom.status !== "active") return "/login";
  const paths = {
    admin: "/admin",
    student: "/student",
    instructor: "/instructor",
    department: "/department",
    certification: "/certification",
  };
  return paths[custom.portalType] ?? "/login";
}

/**
 * @param {Role | string | null | undefined} userRole
 * @param {Role | Role[]} allowed
 * @param {Record<string, import('./portalRoleDefinitions.js').PortalRoleDefinition>} [customById]
 */
export function roleAllowedWithCustom(userRole, allowed, customById = {}) {
  if (!userRole) return false;
  if (roleAllowed(userRole, allowed)) return true;

  const custom = customById[userRole];
  if (!custom || custom.status !== "active") return false;

  const list = Array.isArray(allowed) ? allowed : [allowed];
  const portalTypeToSystemRole = {
    admin: ROLES.ACADEMY_ADMIN,
    student: ROLES.STUDENT,
    instructor: ROLES.INSTRUCTOR,
    department: ROLES.DEPARTMENT,
    certification: ROLES.CERTIFICATION_OFFICER,
  };
  const equivalent = portalTypeToSystemRole[custom.portalType];
  return equivalent ? roleAllowed(equivalent, list) : false;
}

/**
 * @param {Role | string | null | undefined} role
 * @param {Record<string, import('./portalRoleDefinitions.js').PortalRoleDefinition>} [customById]
 */
export function isAdminPortalRole(role, customById = {}) {
  if (!role) return false;
  if (isFullAdmin(role) || role === ROLES.ACADEMY_ADMIN) return true;
  return customById[role]?.portalType === "admin" && customById[role]?.status === "active";
}
