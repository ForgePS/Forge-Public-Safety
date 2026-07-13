import { LOCAL_STORE_KEY } from "../core/constants.js";

const MAX_VERSIONS = 20;
const MAX_DATA_URL_CHARS = 400_000; // ~300KB — keep store under typical 5MB quota

function readStore() {
  try {
    const raw = localStorage.getItem(LOCAL_STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function isQuotaError(err) {
  return (
    err?.name === "QuotaExceededError"
    || err?.name === "NS_ERROR_DOM_QUOTA_REACHED"
    || /quota|setitem/i.test(String(err?.message || err))
  );
}

function stripHeavyDataUrls(value) {
  if (typeof value === "string" && value.startsWith("data:image/") && value.length > MAX_DATA_URL_CHARS) {
    return "";
  }
  if (Array.isArray(value)) return value.map(stripHeavyDataUrls);
  if (value && typeof value === "object") {
    const next = {};
    Object.entries(value).forEach(([k, v]) => {
      next[k] = stripHeavyDataUrls(v);
    });
    return next;
  }
  return value;
}

function pruneForQuota(data, pass = 0) {
  const next = { ...data };

  // Always cap versions first — they duplicate full page/media snapshots.
  const versions = Array.isArray(next.versions) ? next.versions : [];
  next.versions = versions.slice(0, pass === 0 ? MAX_VERSIONS : Math.min(5, MAX_VERSIONS));

  if (pass >= 1) {
    // Drop version payloads' nested data URLs / heavy fields
    next.versions = next.versions.map((v) => ({
      ...v,
      data: v?.data ? stripHeavyDataUrls(v.data) : v?.data,
    }));
  }

  if (pass >= 2) {
    next.versions = [];
    next.formSubmissions = [];
  }

  if (pass >= 3) {
    // Purge oversized base64 media from the library (keep metadata)
    next.media = (Array.isArray(next.media) ? next.media : []).map((item) => {
      if (typeof item?.url === "string" && item.url.startsWith("data:image/") && item.url.length > 50_000) {
        return {
          ...item,
          url: "",
          note: "Removed from local storage to free space. Re-upload after connecting Firebase Storage.",
        };
      }
      return item;
    });
    next.pages = stripHeavyDataUrls(next.pages);
    next.branding = stripHeavyDataUrls(next.branding);
    next.footers = stripHeavyDataUrls(next.footers);
  }

  return next;
}

function writeStore(data) {
  let payload = {
    ...data,
    versions: Array.isArray(data.versions) ? data.versions.slice(0, MAX_VERSIONS) : [],
  };

  for (let pass = 0; pass <= 4; pass += 1) {
    try {
      localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent("cms-store-changed"));
      return payload;
    } catch (err) {
      if (!isQuotaError(err)) throw err;
      if (pass >= 4) {
        // Last resort: wipe CMS local store key only and write a minimal snapshot.
        try {
          localStorage.removeItem(LOCAL_STORE_KEY);
          const minimal = stripHeavyDataUrls({
            ...emptyStore(),
            programs: payload.programs || [],
            pages: payload.pages || [],
            branding: payload.branding || [],
            navigation: payload.navigation || [],
            footers: payload.footers || [],
            forms: payload.forms || [],
            settings: payload.settings || [],
            roles: payload.roles || [],
            users: payload.users || [],
            collections: payload.collections || [],
            emailTemplates: payload.emailTemplates || [],
            seoGlobal: payload.seoGlobal || [],
            search: payload.search || [],
            redirects: payload.redirects || [],
            media: [],
            versions: [],
            formSubmissions: [],
          });
          localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(minimal));
          window.dispatchEvent(new CustomEvent("cms-store-changed"));
          window.dispatchEvent(new CustomEvent("cms-storage-compacted", {
            detail: { message: "Browser storage was full. Cleared local media/history so editing can continue." },
          }));
          return minimal;
        } catch (inner) {
          const quotaErr = new Error(
            "Browser storage is full (localStorage quota). Open Settings → Free browser storage, or Hard reset from deployed seed."
          );
          quotaErr.code = "STORAGE_QUOTA";
          throw quotaErr;
        }
      }
      payload = pruneForQuota(payload, pass);
    }
  }
  return payload;
}

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
  return updateLocalCollection(collection, (items) => {
    if (Array.isArray(item)) return item;
    if (!Array.isArray(items)) {
      if (items && typeof items === "object" && !Array.isArray(items) && items.id === item.id) {
        return { ...items, ...item, updatedAt: new Date().toISOString() };
      }
      return item;
    }
    const index = items.findIndex((i) => i.id === item.id);
    if (index >= 0) {
      const next = [...items];
      next[index] = { ...items[index], ...item, updatedAt: new Date().toISOString() };
      return next;
    }
    return [...items, { ...item, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
  });
}

export function deleteLocalItem(collection, id) {
  return updateLocalCollection(collection, (items) => {
    if (!Array.isArray(items)) return items;
    return items.filter((i) => i.id !== id);
  });
}

export function addLocalVersion(entry) {
  // Never persist giant base64 payloads inside version history.
  const safeEntry = stripHeavyDataUrls(entry);
  return updateLocalCollection("versions", (versions) => [
    {
      id: `ver_${Date.now()}`,
      ...safeEntry,
      createdAt: new Date().toISOString(),
    },
    ...(versions || []).slice(0, MAX_VERSIONS - 1),
  ]);
}

export function isLocalStoreSeeded() {
  const store = readStore();
  return Boolean(store?.pages?.length);
}

export function clearLocalStore() {
  localStorage.removeItem(LOCAL_STORE_KEY);
}

/** Drop history / heavy local uploads to free space. */
export function compactLocalStore() {
  const store = getLocalStore();
  const compacted = pruneForQuota({
    ...store,
    versions: [],
    formSubmissions: [],
  }, 3);
  writeStore(compacted);
  return compacted;
}
