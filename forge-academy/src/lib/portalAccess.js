import {
  homePathForRole,
  isAdminPortalRole,
  isFullAdmin,
  pathAllowedForRole,
} from "./roles.js";
import { customPortalSlugFromPath } from "./portalDefinitions.js";

/** @typedef {'admin' | 'student' | 'department' | 'instructor' | 'certification'} BuiltinPortalKey */

/** @type {{ key: BuiltinPortalKey, path: string, title: string, subtitle: string, alwaysOn?: boolean, isCustom?: false }[]} */
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

/**
 * @typedef {Object} PortalDefinitionEntry
 * @property {string} key
 * @property {string} path
 * @property {string} title
 * @property {string} subtitle
 * @property {boolean} [alwaysOn]
 * @property {boolean} [isCustom]
 * @property {string} [slug]
 */

/** @param {import('./portalDefinitions.js').PortalDefinition[]} customPortals */
export function mergePortalDefinitions(customPortals = []) {
  /** @type {PortalDefinitionEntry[]} */
  const customEntries = customPortals
    .filter((portal) => portal.status === "active")
    .map((portal) => ({
      key: portal.slug,
      slug: portal.slug,
      path: `/p/${portal.slug}`,
      title: portal.label,
      subtitle: portal.description,
      isCustom: true,
    }));
  return [...PORTAL_ACCESS_DEFINITIONS, ...customEntries];
}

/** @returns {Record<string, { enabled: boolean, label: string, description: string, signInMessage: string }>} */
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
 * @param {string} portalKey
 * @param {import('./portalDefinitions.js').PortalDefinition | null} [customPortal]
 */
export function getPortalAccessConfig(settings, portalKey, customPortal = null) {
  if (customPortal) {
    return {
      enabled: customPortal.enabled !== false,
      label: customPortal.label,
      description: customPortal.description,
      signInMessage: customPortal.signInMessage ?? "",
    };
  }

  const defaults = defaultPortalAccessConfig()[portalKey];
  if (!defaults) {
    return {
      enabled: true,
      label: portalKey,
      description: "",
      signInMessage: "",
    };
  }

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
 * @param {string} portalKey
 * @param {Record<string, import('./portalDefinitions.js').PortalDefinition>} [customPortalsBySlug]
 */
export function isPortalAccessEnabled(settings, portalKey, customPortalsBySlug = {}) {
  if (portalKey === "admin") return true;
  if (customPortalsBySlug[portalKey]) {
    return customPortalsBySlug[portalKey].enabled !== false;
  }
  return getPortalAccessConfig(settings, portalKey).enabled;
}

/** @param {string} pathname @returns {string | null} */
export function portalKeyFromPath(pathname) {
  const clean = pathname.split("?")[0].split("#")[0];
  for (const portal of PORTAL_ACCESS_DEFINITIONS) {
    if (clean === portal.path || clean.startsWith(`${portal.path}/`)) {
      return portal.key;
    }
  }
  return customPortalSlugFromPath(clean);
}

/**
 * @param {Record<string, { enabled: boolean, label: string, description: string, signInMessage: string }>} config
 * @returns {Record<string, string | boolean>}
 */
export function serializePortalAccessConfig(config) {
  /** @type {Record<string, string | boolean>} */
  const payload = {};
  for (const portal of PORTAL_ACCESS_DEFINITIONS) {
    const entry = config[portal.key];
    if (!entry) continue;
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
 * @param {import('./portalDefinitions.js').PortalDefinition[]} [customPortals]
 */
export function readPortalAccessConfig(settings, customPortals = []) {
  /** @type {Record<string, { enabled: boolean, label: string, description: string, signInMessage: string }>} */
  const config = Object.fromEntries(
    PORTAL_ACCESS_DEFINITIONS.map((portal) => [portal.key, getPortalAccessConfig(settings, portal.key)]),
  );

  for (const portal of customPortals.filter((item) => item.status === "active")) {
    config[portal.slug] = getPortalAccessConfig(settings, portal.slug, portal);
  }

  return config;
}

/**
 * @param {ReturnType<import('./systemSettings.js').mergeSystemSettings> | undefined} settings
 * @param {string} pathname
 * @param {Record<string, import('./portalDefinitions.js').PortalDefinition>} [customPortalsBySlug]
 */
export function isPathPortalAccessEnabled(settings, pathname, customPortalsBySlug = {}) {
  const portalKey = portalKeyFromPath(pathname);
  if (!portalKey || !settings) return true;
  return isPortalAccessEnabled(settings, portalKey, customPortalsBySlug);
}

/**
 * @param {{ role: import('./roles.js').Role }} user
 * @param {Record<string, import('./portalRoleDefinitions.js').PortalRoleDefinition>} customById
 * @param {ReturnType<import('./systemSettings.js').mergeSystemSettings> | undefined} settings
 * @param {Record<string, import('./portalDefinitions.js').PortalDefinition>} [customPortalsBySlug]
 */
export function resolveSafeHomePath(user, customById, settings, customPortalsBySlug = {}) {
  const home = homePathForRole(user.role, customById, customPortalsBySlug);
  const portalKey = portalKeyFromPath(home);
  if (portalKey && settings && !isPortalAccessEnabled(settings, portalKey, customPortalsBySlug)) {
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
 * @param {Record<string, import('./portalDefinitions.js').PortalDefinition>} [customPortalsBySlug]
 */
export function resolveLoginRedirectPath(
  user,
  customById,
  settings,
  requestedPath,
  customPortalsBySlug = {},
) {
  const home = resolveSafeHomePath(user, customById, settings, customPortalsBySlug);
  if (
    requestedPath &&
    pathAllowedForRole(user.role, requestedPath, customById, customPortalsBySlug) &&
    isPathPortalAccessEnabled(settings, requestedPath, customPortalsBySlug)
  ) {
    return requestedPath;
  }
  return home;
}

/** @deprecated Use BuiltinPortalKey */
/** @typedef {BuiltinPortalKey} PortalAccessKey */
