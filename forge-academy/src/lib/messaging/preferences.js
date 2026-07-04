const STORAGE_KEY = "forge.messaging.preferences.v1";

/** @typedef {Object} MessagingUserPreferences
 * @property {boolean} minimized
 * @property {boolean | null} soundEnabled
 * @property {boolean | null} badgeEnabled
 * @property {boolean | null} toastEnabled
 * @property {string[]} mutedConversationIds
 */

const DEFAULT_PREFS = {
  minimized: true,
  soundEnabled: null,
  badgeEnabled: null,
  toastEnabled: null,
  mutedConversationIds: [],
};

/** @returns {MessagingUserPreferences} */
export function loadMessagingPreferences() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw);
    return {
      minimized: parsed.minimized !== false,
      soundEnabled: parsed.soundEnabled ?? null,
      badgeEnabled: parsed.badgeEnabled ?? null,
      toastEnabled: parsed.toastEnabled ?? null,
      mutedConversationIds: Array.isArray(parsed.mutedConversationIds)
        ? parsed.mutedConversationIds
        : [],
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

/** @param {Partial<MessagingUserPreferences>} patch */
export function saveMessagingPreferences(patch) {
  const current = loadMessagingPreferences();
  const next = { ...current, ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

/** @param {ReturnType<import('../systemSettings.js').mergeSystemSettings>} settings @param {MessagingUserPreferences} prefs */
export function resolveMessagingNotificationPrefs(settings, prefs) {
  const platform = settings?.messaging ?? {};
  return {
    soundEnabled: prefs.soundEnabled ?? platform.playNotificationSound === true,
    badgeEnabled: prefs.badgeEnabled ?? platform.showUnreadBadge !== false,
    toastEnabled: prefs.toastEnabled ?? platform.toastOnNewMessage !== false,
    fileSharingEnabled: platform.fileSharingEnabled !== false,
    maxAttachmentMb: Number(platform.maxAttachmentMb ?? 25),
  };
}
