import {
  homePathForRole,
  isAdminPortalRole,
  isFullAdmin,
  pathAllowedForRole,
} from "./roles.js";

/** @typedef {'admin' | 'student' | 'department' | 'instructor' | 'certification'} PortalAccessKey */

/** @type {{ key: PortalAccessKey, path: string, title: string, subtitle: string, alwaysOn?: boolean }[]} */
export const PORTAL_ACCESS_DEFINITIONS = [
  {
    key: "admin",
    path: "/admin",
    title: "Academy Admin",
    subtitle: "Students, classes, registrations, testing, housing, and reports",
    alwaysOn: true,
  },
  {
    key: "student",
    path: "/student",
    title: "Student Portal",
    subtitle: "Registration, transcripts, tests, skills, housing, and certificates",
  },
  {
    key: "department",
    path: "/department",
    title: "Department Portal",
    subtitle: "Roster, bulk registration, approvals, and compliance",
  },
  {
    key: "instructor",
    path: "/instructor",
    title: "Instructor Portal",
    subtitle: "Classes, attendance, skills, proctoring, and housing rosters",
  },
  {
    key: "certification",
    path: "/certification",
    title: "Certification Portal",
    subtitle: "Professional certification review, renewals, and audit",
  },
];

/** @returns {Record<PortalAccessKey, { enabled: boolean, label: string, description: string, signInMessage: string }>} */
export function defaultPortalAccessConfig() {
  return Object.fromEntries(
    PORTAL_ACCESS_DEFINITIONS.map((portal) => [
      portal.key,
      {
        enabled: portal.alwaysOn ? true : true,
        label: portal.title,
        description: portal.subtitle,
        signInMessage: "",
      },
    ]),
  );
}

/**
 * @param {ReturnType<import('./systemSettings.js').mergeSystemSettings>} settings
 * @param {PortalAccessKey} portalKey
 */
export function getPortalAccessConfig(settings, portalKey) {
  const defaults = defaultPortalAccessConfig()[portalKey];
  const prefix = portalKey;
  const section = settings?.portals ?? {};
  return {
    enabled: portalKey === "admin" ? true : section[`${prefix}Enabled`] !== false,
    label: String(section[`${prefix}Label`] ?? defaults.label),
    description: String(section[`${prefix}Description`] ?? defaults.description),
    signInMessage: String(section[`${prefix}SignInMessage`] ?? ""),
  };
}

/**
 * @param {ReturnType<import('./systemSettings.js').mergeSystemSettings>} settings
 * @param {PortalAccessKey} portalKey
 */
export function isPortalAccessEnabled(settings, portalKey) {
  if (portalKey === "admin") return true;
  return getPortalAccessConfig(settings, portalKey).enabled;
}

/** @param {string} pathname @returns {PortalAccessKey | null} */
export function portalKeyFromPath(pathname) {
  const clean = pathname.split("?")[0].split("#")[0];
  for (const portal of PORTAL_ACCESS_DEFINITIONS) {
    if (clean === portal.path || clean.startsWith(`${portal.path}/`)) {
      return portal.key;
    }
  }
  return null;
}

/**
 * @param {Record<PortalAccessKey, { enabled: boolean, label: string, description: string, signInMessage: string }>} config
 * @returns {Record<string, string | boolean>}
 */
export function serializePortalAccessConfig(config) {
  /** @type {Record<string, string | boolean>} */
  const payload = {};
  for (const portal of PORTAL_ACCESS_DEFINITIONS) {
    const entry = config[portal.key];
    if (portal.alwaysOn) {
      payload[`${portal.key}Label`] = entry.label;
      payload[`${portal.key}Description`] = entry.description;
      payload[`${portal.key}SignInMessage`] = entry.signInMessage;
      continue;
    }
    payload[`${portal.key}Enabled`] = Boolean(entry.enabled);
    payload[`${portal.key}Label`] = entry.label;
    payload[`${portal.key}Description`] = entry.description;
    payload[`${portal.key}SignInMessage`] = entry.signInMessage;
  }
  return payload;
}

/**
 * @param {ReturnType<import('./systemSettings.js').mergeSystemSettings>} settings
 * @returns {Record<PortalAccessKey, { enabled: boolean, label: string, description: string, signInMessage: string }>}
 */
export function readPortalAccessConfig(settings) {
  return Object.fromEntries(
    PORTAL_ACCESS_DEFINITIONS.map((portal) => [portal.key, getPortalAccessConfig(settings, portal.key)]),
  );
}

/**
 * @param {ReturnType<import('./systemSettings.js').mergeSystemSettings> | undefined} settings
 * @param {string} pathname
 */
export function isPathPortalAccessEnabled(settings, pathname) {
  const portalKey = portalKeyFromPath(pathname);
  if (!portalKey || !settings) return true;
  return isPortalAccessEnabled(settings, portalKey);
}

/**
 * @param {{ role: import('./roles.js').Role }} user
 * @param {Record<string, import('./portalRoleDefinitions.js').PortalRoleDefinition>} customById
 * @param {ReturnType<import('./systemSettings.js').mergeSystemSettings> | undefined} settings
 */
export function resolveSafeHomePath(user, customById, settings) {
  const home = homePathForRole(user.role, customById);
  const portalKey = portalKeyFromPath(home);
  if (portalKey && settings && !isPortalAccessEnabled(settings, portalKey)) {
    if (isFullAdmin(user.role) || isAdminPortalRole(user.role, customById)) {
      return "/admin";
    }
    return "/unauthorized";
  }
  return home;
}

/**
 * @param {{ role: import('./roles.js').Role }} user
 * @param {Record<string, import('./portalRoleDefinitions.js').PortalRoleDefinition>} customById
 * @param {ReturnType<import('./systemSettings.js').mergeSystemSettings> | undefined} settings
 * @param {string | undefined} requestedPath
 */
export function resolveLoginRedirectPath(user, customById, settings, requestedPath) {
  const home = resolveSafeHomePath(user, customById, settings);
  if (
    requestedPath &&
    pathAllowedForRole(user.role, requestedPath, customById) &&
    isPathPortalAccessEnabled(settings, requestedPath)
  ) {
    return requestedPath;
  }
  return home;
}
