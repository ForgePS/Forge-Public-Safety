import { LOCAL_STORE_KEY } from "../core/constants.js";

const MAX_VERSIONS = 10;
const SAFE_STORE_CHARS = 3_500_000; // leave headroom under typical ~5MB quota
const LEGACY_KEYS = ["forge_cms_data_v1", "forge_cms_data_v2_backup"];

function emptyStore() {
  return {
    programs: [],
    pages: [],
    savedSections: [],
    branding: [],
    navigation: [],
    footers: [],
    media: [],
    forms: [],
    formSubmissions: [],
    collections: [],
    collectionEntries: [],
    settings: [],
    emailTemplates: [],
    popups: [],
    integrations: [],
    roles: [],
    users: [],
    versions: [],
    redirects: [],
    seoGlobal: [],
    search: [],
  };
}

function isQuotaError(err) {
  return (
    err?.name === "QuotaExceededError"
    || err?.code === 22
    || err?.code === 1014
    || err?.name === "NS_ERROR_DOM_QUOTA_REACHED"
    || /quota|setitem|exceeded/i.test(String(err?.message || err))
  );
}

/** Remove every data: URL from the tree (base64 images are the quota killer). */
function stripAllDataUrls(value) {
  if (typeof value === "string") {
    if (value.startsWith("data:")) return "";
    return value;
  }
  if (Array.isArray(value)) return value.map(stripAllDataUrls);
  if (value && typeof value === "object") {
    const next = Array.isArray(value) ? [] : {};
    Object.entries(value).forEach(([k, v]) => {
      next[k] = stripAllDataUrls(v);
    });
    return next;
  }
  return value;
}

function estimateSize(data) {
  try {
    return JSON.stringify(data).length;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

function slimMedia(media) {
  return (Array.isArray(media) ? media : [])
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const url = typeof item.url === "string" ? item.url : "";
      if (url.startsWith("data:")) {
        return {
          id: item.id,
          name: item.name || "image",
          url: "",
          type: item.type || "image",
          alt: item.alt || "",
          programId: item.programId,
          note: "Inline image removed to free browser storage. Use /assets/... paths or Firebase Storage.",
        };
      }
      return item;
    })
    .filter((item) => item.url || item.note);
}

function makeLeanStore(data) {
  const base = { ...emptyStore(), ...(data || {}) };
  return stripAllDataUrls({
    ...base,
    versions: [],
    formSubmissions: [],
    media: slimMedia(base.media),
    savedSections: [],
    popups: Array.isArray(base.popups) ? base.popups.slice(0, 20) : [],
  });
}

function makeMinimalStore(data) {
  const base = data || {};
  return stripAllDataUrls({
    ...emptyStore(),
    programs: base.programs || [],
    pages: base.pages || [],
    branding: base.branding || [],
    navigation: base.navigation || [],
    footers: base.footers || [],
    forms: base.forms || [],
    settings: base.settings || [],
    roles: base.roles || [],
    users: base.users || [],
    collections: base.collections || [],
    emailTemplates: base.emailTemplates || [],
    seoGlobal: base.seoGlobal || [],
    search: base.search || [],
    redirects: base.redirects || [],
    media: [],
    versions: [],
    formSubmissions: [],
  });
}

function clearRelatedKeys() {
  try {
    localStorage.removeItem(LOCAL_STORE_KEY);
  } catch {
    /* ignore */
  }
  LEGACY_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  });
}

function trySet(raw) {
  localStorage.setItem(LOCAL_STORE_KEY, raw);
  window.dispatchEvent(new CustomEvent("cms-store-changed"));
}

function writeStore(data) {
  let payload = {
    ...data,
    versions: Array.isArray(data.versions) ? data.versions.slice(0, MAX_VERSIONS) : [],
  };

  // Preemptively slim if already near quota.
  if (estimateSize(payload) > SAFE_STORE_CHARS) {
    payload = makeLeanStore(payload);
  }

  const attempts = [
    () => payload,
    () => makeLeanStore(payload),
    () => makeMinimalStore(payload),
    () => makeMinimalStore({
      programs: payload.programs,
      pages: (payload.pages || []).map((page) => ({
        ...page,
        sections: (page.sections || []).slice(0, 8),
      })),
      branding: payload.branding,
      navigation: payload.navigation,
      footers: payload.footers,
      forms: payload.forms,
      settings: payload.settings,
      roles: payload.roles,
      users: payload.users,
    }),
    () => ({
      ...emptyStore(),
      programs: payload.programs || [],
      pages: [],
      branding: payload.branding || [],
      navigation: payload.navigation || [],
      roles: payload.roles || [],
      users: payload.users || [],
    }),
  ];

  let lastError = null;
  for (let i = 0; i < attempts.length; i += 1) {
    const next = attempts[i]();
    const raw = JSON.stringify(next);
    try {
      trySet(raw);
      if (i > 0) {
        window.dispatchEvent(new CustomEvent("cms-storage-compacted", {
          detail: {
            message: "Browser storage was full. Removed inline images/history so saving can continue.",
            pass: i,
          },
        }));
      }
      return next;
    } catch (err) {
      lastError = err;
      if (!isQuotaError(err)) throw err;
      // Free the existing oversized value before retrying a smaller write.
      clearRelatedKeys();
    }
  }

  const quotaErr = new Error(
    "Browser storage is full. Open Settings → Free browser storage, then Hard reset from deployed seed."
  );
  quotaErr.code = "STORAGE_QUOTA";
  quotaErr.cause = lastError;
  throw quotaErr;
}

function readStore() {
  try {
    const raw = localStorage.getItem(LOCAL_STORE_KEY);
    if (!raw) return null;
    if (raw.length > SAFE_STORE_CHARS) {
      // Auto-heal an already oversized store on read.
      const parsed = JSON.parse(raw);
      return writeStore(makeLeanStore(parsed));
    }
    return JSON.parse(raw);
  } catch (err) {
    if (isQuotaError(err)) {
      clearRelatedKeys();
      return emptyStore();
    }
    return null;
  }
}

export function getLocalStore() {
  return readStore() || emptyStore();
}

export function setLocalStore(data) {
  writeStore(data);
}

export function updateLocalCollection(collection, updater) {
  const store = getLocalStore();
  const current = store[collection];
  store[collection] = typeof updater === "function" ? updater(current) : updater;
  writeStore(store);
  return store[collection];
}

export function getLocalItem(collection, id) {
  const store = getLocalStore();
  const items = store[collection];
  if (!Array.isArray(items)) {
    if (items?.id === id) return items;
    return null;
  }
  return items.find((item) => item.id === id) || null;
}

export function upsertLocalItem(collection, item) {
  // Never persist giant data-URLs into the media collection.
  let safeItem = item;
  if (collection === "media" && item && !Array.isArray(item)) {
    if (typeof item.url === "string" && item.url.startsWith("data:") && item.url.length > 80_000) {
      throw new Error(
        "Image is too large for browser storage. Use a file under 500 KB, or an /assets/... path."
      );
    }
  }
  if (collection === "pages" && item && !Array.isArray(item)) {
    // Never keep inline base64 in pages — it quickly exceeds localStorage quota.
    safeItem = stripAllDataUrls(item);
  }

  return updateLocalCollection(collection, (items) => {
    if (Array.isArray(safeItem)) return safeItem;
    if (!Array.isArray(items)) {
      if (items && typeof items === "object" && !Array.isArray(items) && items.id === safeItem.id) {
        return { ...items, ...safeItem, updatedAt: new Date().toISOString() };
      }
      return safeItem;
    }
    const index = items.findIndex((i) => i.id === safeItem.id);
    if (index >= 0) {
      const next = [...items];
      next[index] = { ...items[index], ...safeItem, updatedAt: new Date().toISOString() };
      return next;
    }
    return [...items, { ...safeItem, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
  });
}

export function deleteLocalItem(collection, id) {
  return updateLocalCollection(collection, (items) => {
    if (!Array.isArray(items)) return items;
    return items.filter((i) => i.id !== id);
  });
}

export function addLocalVersion(entry) {
  // Version history is optional in local mode; keep it tiny.
  const safeEntry = stripAllDataUrls(entry);
  const store = getLocalStore();
  const versions = [
    {
      id: `ver_${Date.now()}`,
      ...safeEntry,
      createdAt: new Date().toISOString(),
    },
    ...(store.versions || []).slice(0, MAX_VERSIONS - 1),
  ];
  // Prefer a direct write without cloning the whole media payload again if possible.
  try {
    return updateLocalCollection("versions", () => versions);
  } catch (err) {
    if (!isQuotaError(err)) throw err;
    // Give up on versions rather than breaking saves.
    writeStore({ ...store, versions: [] });
    return [];
  }
}

export function isLocalStoreSeeded() {
  const store = readStore();
  return Boolean(store?.pages?.length);
}

export function clearLocalStore() {
  clearRelatedKeys();
}

/** Drop history / inline uploads to free space. Safe to run anytime. */
export function compactLocalStore() {
  let existing = emptyStore();
  try {
    const raw = localStorage.getItem(LOCAL_STORE_KEY);
    if (raw) existing = JSON.parse(raw);
  } catch {
    existing = emptyStore();
  }
  clearRelatedKeys();
  const written = writeStore(makeLeanStore(existing));
  window.dispatchEvent(new CustomEvent("cms-storage-compacted", {
    detail: { message: "Freed browser storage by removing inline images and history." },
  }));
  return written;
}

/** Nuclear option used by Settings when quota is already exceeded. */
export function emergencyClearCmsLocalStorage() {
  clearRelatedKeys();
  // Also sweep any other large CMS-ish keys.
  try {
    const doomed = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (/forge_cms|cms_seed|cms-store/i.test(key)) doomed.push(key);
    }
    doomed.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    });
  } catch {
    /* ignore */
  }
  const empty = emptyStore();
  try {
    trySet(JSON.stringify(empty));
  } catch {
    // If even empty fails, site has critical quota issues outside our key.
  }
  return empty;
}
