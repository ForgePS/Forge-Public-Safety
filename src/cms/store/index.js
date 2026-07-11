import { CMS_COLLECTIONS } from "../core/constants.js";
import {
  getLocalStore,
  getLocalItem,
  upsertLocalItem,
  deleteLocalItem,
  getLocalSingleton,
  setLocalSingleton,
  addLocalVersion,
  isLocalStoreSeeded,
} from "./localStore.js";
import {
  isFirebaseConfigured,
  firestoreGetCollection,
  firestoreGetDoc,
  firestoreSetDoc,
  firestoreDeleteDoc,
  firestoreGetBySlug,
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
};

const SINGLETON_KEYS = new Set(["branding", "navigation", "settings", "seoGlobal", "search"]);

function useFirebase() {
  return isFirebaseConfigured();
}

export async function getAll(key) {
  if (useFirebase()) {
    if (SINGLETON_KEYS.has(key)) {
      const doc = await firestoreGetDoc(COLLECTION_MAP[key], "default");
      return doc;
    }
    return firestoreGetCollection(COLLECTION_MAP[key]);
  }
  const store = getLocalStore();
  return SINGLETON_KEYS.has(key) ? store[key] : store[key] || [];
}

export async function getById(key, id) {
  if (useFirebase()) {
    return firestoreGetDoc(COLLECTION_MAP[key], id);
  }
  return getLocalItem(key, id);
}

export async function getPageBySlug(slug) {
  const normalizedSlug = slug === "/" || slug === "" ? "home" : slug.replace(/^\//, "");
  if (useFirebase()) {
    return firestoreGetBySlug(COLLECTION_MAP.pages, normalizedSlug);
  }
  const pages = getLocalStore().pages || [];
  return pages.find((p) => p.slug === normalizedSlug) || null;
}

export async function getPublishedPages() {
  const pages = await getAll("pages");
  const now = new Date();
  return (pages || []).filter((p) => {
    if (p.status === "published") return true;
    if (p.status === "scheduled" && p.scheduledAt && new Date(p.scheduledAt) <= now) return true;
    return false;
  });
}

export async function save(key, item, userId = "system") {
  const id = item.id || (SINGLETON_KEYS.has(key) ? "default" : undefined);
  if (!id) throw new Error("Item must have an id");

  const payload = {
    ...item,
    id,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  };

  if (useFirebase()) {
    await firestoreSetDoc(COLLECTION_MAP[key], id, payload);
  } else if (SINGLETON_KEYS.has(key)) {
    setLocalSingleton(key, payload);
  } else {
    upsertLocalItem(key, payload);
  }

  await saveVersion(key, id, payload, userId);
  return payload;
}

export async function remove(key, id) {
  if (useFirebase()) {
    await firestoreDeleteDoc(COLLECTION_MAP[key], id);
  } else {
    deleteLocalItem(key, id);
  }
}

export async function saveVersion(resourceType, resourceId, data, userId, summary = "Updated") {
  const version = {
    resourceType,
    resourceId,
    data: JSON.parse(JSON.stringify(data)),
    userId,
    summary,
  };
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

export async function getVersions(resourceType, resourceId) {
  const all = await getAll("versions");
  return (all || [])
    .filter((v) => v.resourceType === resourceType && v.resourceResourceId === resourceId || v.resourceId === resourceId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function subscribe(key, callback) {
  if (useFirebase()) {
    return firestoreSubscribe(COLLECTION_MAP[key], callback);
  }
  const handler = () => {
    const store = getLocalStore();
    callback(SINGLETON_KEYS.has(key) ? [store[key]].filter(Boolean) : store[key] || []);
  };
  window.addEventListener("cms-store-changed", handler);
  handler();
  return () => window.removeEventListener("cms-store-changed", handler);
}

export function isSeeded() {
  if (useFirebase()) return true;
  return isLocalStoreSeeded();
}

export { useFirebase as isUsingFirebase };
