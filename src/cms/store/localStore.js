import { LOCAL_STORE_KEY } from "../core/constants.js";

function readStore() {
  try {
    const raw = localStorage.getItem(LOCAL_STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStore(data) {
  localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("cms-store-changed"));
}

function emptyStore() {
  return {
    pages: [],
    savedSections: [],
    branding: null,
    navigation: null,
    footers: [],
    media: [],
    forms: [],
    formSubmissions: [],
    collections: [],
    collectionEntries: [],
    settings: null,
    emailTemplates: [],
    popups: [],
    integrations: [],
    roles: [],
    users: [],
    versions: [],
    redirects: [],
    seoGlobal: null,
    search: null,
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
  if (!Array.isArray(items)) return items;
  return items.find((item) => item.id === id) || null;
}

export function upsertLocalItem(collection, item) {
  return updateLocalCollection(collection, (items) => {
    if (!Array.isArray(items)) return item;
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

export function getLocalSingleton(collection) {
  const store = getLocalStore();
  return store[collection];
}

export function setLocalSingleton(collection, data) {
  return updateLocalCollection(collection, data);
}

export function addLocalVersion(entry) {
  return updateLocalCollection("versions", (versions) => [
    {
      id: `ver_${Date.now()}`,
      ...entry,
      createdAt: new Date().toISOString(),
    },
    ...(versions || []).slice(0, 99),
  ]);
}

export function isLocalStoreSeeded() {
  return Boolean(readStore()?.pages?.length);
}

export function clearLocalStore() {
  localStorage.removeItem(LOCAL_STORE_KEY);
}
