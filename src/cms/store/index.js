import { CMS_COLLECTIONS, LOCAL_STORE_KEY, LEGACY_STORE_KEY } from "../core/constants.js";
import { DEFAULT_PROGRAM_ID, DEFAULT_PROGRAMS, withProgramId, belongsToProgram, programSingletonId } from "../core/programs.js";
import {
  getLocalStore,
  getLocalItem,
  upsertLocalItem,
  deleteLocalItem,
  addLocalVersion,
  isLocalStoreSeeded,
  setLocalStore,
  compactLocalStore,
  emergencyClearCmsLocalStorage,
} from "./localStore.js";
import {
  isFirebaseConfigured,
  firestoreGetCollection,
  firestoreGetDoc,
  firestoreSetDoc,
  firestoreDeleteDoc,
  firestoreSubscribe,
} from "./firebase.js";

const COLLECTION_MAP = {
  pages: CMS_COLLECTIONS.pages,
  savedSections: CMS_COLLECTIONS.savedSections,
  branding: CMS_COLLECTIONS.branding,
  navigation: CMS_COLLECTIONS.navigation,
  footers: CMS_COLLECTIONS.footers,
  media: CMS_COLLECTIONS.media,
  forms: CMS_COLLECTIONS.forms,
  formSubmissions: CMS_COLLECTIONS.formSubmissions,
  collections: CMS_COLLECTIONS.collections,
  collectionEntries: CMS_COLLECTIONS.collectionEntries,
  settings: CMS_COLLECTIONS.settings,
  emailTemplates: CMS_COLLECTIONS.emailTemplates,
  popups: CMS_COLLECTIONS.popups,
  integrations: CMS_COLLECTIONS.integrations,
  roles: CMS_COLLECTIONS.roles,
  users: CMS_COLLECTIONS.users,
  versions: CMS_COLLECTIONS.versions,
  redirects: CMS_COLLECTIONS.redirects,
  seoGlobal: CMS_COLLECTIONS.seoGlobal,
  search: CMS_COLLECTIONS.search,
  programs: CMS_COLLECTIONS.programs,
};

const SINGLETON_KEYS = new Set(["branding", "navigation", "settings", "seoGlobal", "search"]);

function useFirebase() {
  return isFirebaseConfigured();
}

function filterByProgram(items, programId) {
  if (!Array.isArray(items)) return items;
  const pid = programId || DEFAULT_PROGRAM_ID;
  return items.filter((item) => belongsToProgram(item, pid));
}

function getSingletonForProgram(items, programId) {
  const pid = programSingletonId(programId);
  if (!Array.isArray(items)) {
    return items?.programId === pid || items?.id === pid ? items : null;
  }
  return items.find((item) => item.id === pid || item.programId === pid) || null;
}

export async function getAll(key, programId = null) {
  let data;
  if (useFirebase()) {
    if (SINGLETON_KEYS.has(key)) {
      if (programId) {
        return firestoreGetDoc(COLLECTION_MAP[key], programSingletonId(programId));
      }
      const snap = await firestoreGetCollection(COLLECTION_MAP[key]);
      return snap;
    }
    data = await firestoreGetCollection(COLLECTION_MAP[key]);
  } else {
    const store = getLocalStore();
    data = SINGLETON_KEYS.has(key) ? store[key] : store[key] || [];
  }

  if (key === "programs") return Array.isArray(data) ? data : [];
  if (programId && SINGLETON_KEYS.has(key)) return getSingletonForProgram(Array.isArray(data) ? data : [data].filter(Boolean), programId);
  if (programId) return filterByProgram(Array.isArray(data) ? data : [], programId);
  return data;
}

export async function getById(key, id) {
  if (useFirebase()) {
    return firestoreGetDoc(COLLECTION_MAP[key], id);
  }
  return getLocalItem(key, id);
}

export async function getPageBySlug(slug, programId = DEFAULT_PROGRAM_ID) {
  const normalizedSlug = slug === "/" || slug === "" ? "home" : slug.replace(/^\//, "");
  const pages = await getAll("pages", programId);
  return (pages || []).find((p) => p.slug === normalizedSlug) || null;
}

export async function getPublishedPages(programId = DEFAULT_PROGRAM_ID) {
  const pages = await getAll("pages", programId);
  const now = new Date();
  return (pages || []).filter((p) => {
    if (p.status === "published") return true;
    if (p.status === "scheduled" && p.scheduledAt && new Date(p.scheduledAt) <= now) return true;
    return false;
  });
}

const GLOBAL_KEYS = new Set(["programs", "roles", "users"]);

export async function save(key, item, userId = "system", programId = null, options = {}) {
  const pid = programId || item.programId || DEFAULT_PROGRAM_ID;
  const base = {
    ...item,
    id: item.id || (SINGLETON_KEYS.has(key) ? programSingletonId(pid) : undefined),
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  };
  const payload = GLOBAL_KEYS.has(key) ? base : withProgramId(base, pid);

  if (!payload.id) throw new Error("Item must have an id");

  if (useFirebase()) {
    await firestoreSetDoc(COLLECTION_MAP[key], payload.id, payload);
  } else if (SINGLETON_KEYS.has(key)) {
    const store = getLocalStore();
    const existing = Array.isArray(store[key]) ? store[key] : store[key] ? [store[key]] : [];
    const index = existing.findIndex((i) => i.id === payload.id || i.programId === pid);
    const next = [...existing];
    if (index >= 0) next[index] = payload;
    else next.push(payload);
    upsertLocalItem(key, next);
  } else {
    upsertLocalItem(key, payload);
  }

  // Skip version history for media and explicit lightweight writes — data URLs blow the quota.
  const skipVersion = options.version === false || key === "media";
  if (!skipVersion) {
    await saveVersion(key, payload.id, payload, userId, undefined, pid);
  }
  return payload;
}

export async function remove(key, id) {
  if (useFirebase()) {
    await firestoreDeleteDoc(COLLECTION_MAP[key], id);
  } else {
    deleteLocalItem(key, id);
  }
}

export async function saveVersion(resourceType, resourceId, data, userId, summary = "Updated", programId = DEFAULT_PROGRAM_ID) {
  const version = withProgramId({
    resourceType,
    resourceId,
    data: JSON.parse(JSON.stringify(data)),
    userId,
    summary,
  }, programId);
  if (useFirebase()) {
    const versionId = `ver_${Date.now()}`;
    await firestoreSetDoc(COLLECTION_MAP.versions, versionId, {
      ...version,
      id: versionId,
      createdAt: new Date().toISOString(),
    });
  } else {
    addLocalVersion(version);
  }
}

export async function getVersions(resourceType, resourceId, programId = null) {
  const all = await getAll("versions");
  return (all || [])
    .filter((v) => {
      if (programId && !belongsToProgram(v, programId)) return false;
      return v.resourceType === resourceType && (v.resourceId === resourceId);
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function subscribe(key, callback) {
  if (useFirebase()) {
    return firestoreSubscribe(COLLECTION_MAP[key], callback);
  }
  const handler = () => {
    const store = getLocalStore();
    callback(store[key] || []);
  };
  window.addEventListener("cms-store-changed", handler);
  handler();
  return () => window.removeEventListener("cms-store-changed", handler);
}

export function isSeeded() {
  if (useFirebase()) return true;
  return isLocalStoreSeeded();
}

export function migrateLegacyStore() {
  try {
    const legacy = localStorage.getItem(LEGACY_STORE_KEY);
    if (!legacy || localStorage.getItem(LOCAL_STORE_KEY)) return false;
    const data = JSON.parse(legacy);
    const tag = (items) => {
      if (!items) return items;
      if (Array.isArray(items)) return items.map((i) => withProgramId(i, DEFAULT_PROGRAM_ID));
      return withProgramId({ ...items, id: items.id === "default" ? DEFAULT_PROGRAM_ID : items.id }, DEFAULT_PROGRAM_ID);
    };
    const migrated = {
      ...data,
      programs: data.programs?.length ? data.programs : DEFAULT_PROGRAMS,
      pages: tag(data.pages),
      footers: tag(data.footers),
      forms: tag(data.forms),
      media: tag(data.media),
      collections: tag(data.collections),
      popups: tag(data.popups),
      redirects: tag(data.redirects),
      branding: Array.isArray(data.branding) ? tag(data.branding) : tag([data.branding].filter(Boolean)),
      navigation: Array.isArray(data.navigation) ? tag(data.navigation) : tag([data.navigation].filter(Boolean)),
      settings: Array.isArray(data.settings) ? tag(data.settings) : tag([data.settings].filter(Boolean)),
      seoGlobal: Array.isArray(data.seoGlobal) ? tag(data.seoGlobal) : tag([data.seoGlobal].filter(Boolean)),
      search: Array.isArray(data.search) ? tag(data.search) : tag([data.search].filter(Boolean)),
    };
    setLocalStore(migrated);
    return true;
  } catch {
    return false;
  }
}

export { useFirebase as isUsingFirebase, compactLocalStore, emergencyClearCmsLocalStorage };
