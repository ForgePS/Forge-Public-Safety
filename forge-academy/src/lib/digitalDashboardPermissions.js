import { ROLES } from "./roles.js";

/** @typedef {{ view: boolean, edit: boolean }} SectionPermission */
/** @typedef {Record<string, SectionPermission>} DigitalDashboardPermissionMap */

/** @type {{ id: string, label: string, description: string, supportsEdit: boolean }[]} */
export const DIGITAL_DASHBOARD_SECTIONS = [
  { id: "overview", label: "Overview", description: "Dashboard summary and display network", supportsEdit: false },
  { id: "displays", label: "Displays", description: "Register and configure wall players", supportsEdit: true },
  { id: "devices", label: "Devices", description: "Health monitoring and remote commands", supportsEdit: true },
  { id: "virtualPlayer", label: "Virtual Player", description: "Browser-based content preview player", supportsEdit: true },
  { id: "groups", label: "Groups", description: "Lobby, classroom, dining, and other display groups", supportsEdit: true },
  { id: "media", label: "Media", description: "Announcements, images, video, and documents", supportsEdit: true },
  { id: "playlists", label: "Playlists", description: "Content rotation loops", supportsEdit: true },
  { id: "layouts", label: "Layouts", description: "Multi-zone screen templates", supportsEdit: true },
  { id: "widgets", label: "Widgets", description: "Live widget library", supportsEdit: true },
  { id: "schedules", label: "Schedules", description: "Publishing windows and priorities", supportsEdit: true },
  { id: "dining", label: "Dining", description: "Weekly campus menus", supportsEdit: true },
  { id: "alerts", label: "Alerts", description: "Emergency override messages", supportsEdit: true },
  { id: "analytics", label: "Analytics", description: "Uptime, usage, and content views", supportsEdit: false },
  { id: "platform", label: "Platform", description: "Forge Displays roadmap and spec status", supportsEdit: false },
];

/** @returns {DigitalDashboardPermissionMap} */
export function createFullDigitalDashboardPermissions() {
  /** @type {DigitalDashboardPermissionMap} */
  const map = {};
  for (const section of DIGITAL_DASHBOARD_SECTIONS) {
    map[section.id] = { view: true, edit: section.supportsEdit };
  }
  return map;
}

/** @returns {DigitalDashboardPermissionMap} */
export function createEmptyDigitalDashboardPermissions() {
  /** @type {DigitalDashboardPermissionMap} */
  const map = {};
  for (const section of DIGITAL_DASHBOARD_SECTIONS) {
    map[section.id] = { view: false, edit: false };
  }
  return map;
}

/** @param {import('./roles.js').Role | null | undefined} role */
export function roleBypassesDigitalDashboardPermissions(role) {
  return role === ROLES.CREATOR || role === ROLES.SUPER_ADMIN;
}

/** @param {import('./users.js').AppUserRecord | null | undefined} user */
export function hasCustomDigitalDashboardPermissions(user) {
  return Boolean(user?.permissions?.digitalDashboard && typeof user.permissions.digitalDashboard === "object");
}

/**
 * @param {Record<string, { view?: boolean, edit?: boolean }>} stored
 * @returns {DigitalDashboardPermissionMap}
 */
export function normalizeDigitalDashboardPermissions(stored = {}) {
  const base = createEmptyDigitalDashboardPermissions();
  for (const section of DIGITAL_DASHBOARD_SECTIONS) {
    const row = stored[section.id] ?? {};
    const view = row.view === true;
    const edit = section.supportsEdit ? view && row.edit === true : false;
    base[section.id] = { view, edit };
  }
  return base;
}

/** @param {import('./users.js').AppUserRecord | null | undefined} user */
export function resolveDigitalDashboardPermissions(user) {
  if (roleBypassesDigitalDashboardPermissions(user?.role)) {
    return createFullDigitalDashboardPermissions();
  }

  if (hasCustomDigitalDashboardPermissions(user)) {
    return normalizeDigitalDashboardPermissions(user.permissions.digitalDashboard);
  }

  if (user?.role === ROLES.ACADEMY_ADMIN) {
    return createFullDigitalDashboardPermissions();
  }

  return createEmptyDigitalDashboardPermissions();
}

/** @param {import('./users.js').AppUserRecord | null | undefined} user @param {string} sectionId */
export function canViewDigitalDashboardSection(user, sectionId) {
  return resolveDigitalDashboardPermissions(user)[sectionId]?.view === true;
}

/** @param {import('./users.js').AppUserRecord | null | undefined} user @param {string} sectionId */
export function canEditDigitalDashboardSection(user, sectionId) {
  const section = DIGITAL_DASHBOARD_SECTIONS.find((item) => item.id === sectionId);
  if (!section?.supportsEdit) return false;
  return resolveDigitalDashboardPermissions(user)[sectionId]?.edit === true;
}

/** @param {import('./users.js').AppUserRecord | null | undefined} user */
export function canAccessDigitalDashboard(user) {
  return DIGITAL_DASHBOARD_SECTIONS.some((section) => canViewDigitalDashboardSection(user, section.id));
}

/** @param {import('./users.js').AppUserRecord | null | undefined} user */
export function canEditAnyDigitalDashboardSection(user) {
  return DIGITAL_DASHBOARD_SECTIONS.some((section) => canEditDigitalDashboardSection(user, section.id));
}

/**
 * @param {DigitalDashboardPermissionMap} permissions
 * @param {string} sectionId
 * @param {"view"|"edit"} action
 * @param {boolean} checked
 */
export function patchDigitalDashboardPermission(permissions, sectionId, action, checked) {
  const next = { ...permissions, [sectionId]: { ...permissions[sectionId] } };
  const section = DIGITAL_DASHBOARD_SECTIONS.find((item) => item.id === sectionId);
  if (!next[sectionId]) {
    next[sectionId] = { view: false, edit: false };
  }

  if (action === "view") {
    next[sectionId].view = checked;
    if (!checked) next[sectionId].edit = false;
  } else {
    next[sectionId].edit = section?.supportsEdit ? checked && next[sectionId].view : false;
  }

  return next;
}

/** @param {DigitalDashboardPermissionMap} permissions */
export function serializeDigitalDashboardPermissions(permissions) {
  return normalizeDigitalDashboardPermissions(permissions);
}
