/**
 * Dual storage adapter: local (localStorage demo) or firebase (Firestore).
 * Switch via VITE_FLEET_STORAGE env var.
 */

const STORAGE_KEY_PREFIX = "forge-fleet:";

export const STORAGE_MODES = {
  LOCAL: "local",
  FIREBASE: "firebase",
};

export function getStorageMode() {
  const mode = import.meta.env.VITE_FLEET_STORAGE ?? STORAGE_MODES.LOCAL;
  return mode === STORAGE_MODES.FIREBASE ? STORAGE_MODES.FIREBASE : STORAGE_MODES.LOCAL;
}

export function isFirebaseMode() {
  return getStorageMode() === STORAGE_MODES.FIREBASE;
}

function localKey(collection) {
  return `${STORAGE_KEY_PREFIX}${collection}`;
}

function readLocalCollection(collection) {
  try {
    const raw = localStorage.getItem(localKey(collection));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLocalCollection(collection, data) {
  localStorage.setItem(localKey(collection), JSON.stringify(data));
}

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function nowIso() {
  return new Date().toISOString();
}

/** @typedef {{ id: string, createdAt: string, updatedAt: string }} BaseRecord */

/**
 * @template T
 * @param {string} collection
 * @param {(id: string, data: Record<string, unknown>) => T | null} mapper
 */
export function createLocalStore(collection, mapper) {
  return {
    async list() {
      const data = readLocalCollection(collection);
      return Object.entries(data)
        .map(([id, record]) => mapper(id, /** @type {Record<string, unknown>} */ (record)))
        .filter(Boolean);
    },

    async get(id) {
      const data = readLocalCollection(collection);
      const record = data[id];
      if (!record) return null;
      return mapper(id, /** @type {Record<string, unknown>} */ (record));
    },

    async create(input) {
      const data = readLocalCollection(collection);
      const id = generateId();
      const timestamp = nowIso();
      const record = {
        ...input,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      data[id] = record;
      writeLocalCollection(collection, data);
      return id;
    },

    async update(id, input) {
      const data = readLocalCollection(collection);
      const existing = data[id];
      if (!existing) throw new Error(`Record ${id} not found in ${collection}.`);
      data[id] = {
        ...existing,
        ...input,
        updatedAt: nowIso(),
      };
      writeLocalCollection(collection, data);
    },

    async remove(id) {
      const data = readLocalCollection(collection);
      if (!data[id]) throw new Error(`Record ${id} not found in ${collection}.`);
      delete data[id];
      writeLocalCollection(collection, data);
    },

    async queryByField(field, value) {
      const data = readLocalCollection(collection);
      return Object.entries(data)
        .filter(([, record]) => record[field] === value)
        .map(([id, record]) => mapper(id, /** @type {Record<string, unknown>} */ (record)))
        .filter(Boolean);
    },
  };
}

/**
 * @template T
 * @param {string} collectionName
 * @param {(id: string, data: Record<string, unknown>) => T | null} mapper
 */
export function createFirestoreStore(collectionName, mapper) {
  let db = null;

  async function getDb() {
    if (!db) {
      const { getDb: getFirestoreDb } = await import("./firebase.js");
      db = getFirestoreDb();
    }
    return db;
  }

  return {
    async list() {
      const firestore = await getDb();
      const { collection, getDocs, query } = await import("firebase/firestore");
      const snap = await getDocs(query(collection(firestore, collectionName)));
      return snap.docs
        .map((item) => mapper(item.id, item.data()))
        .filter(Boolean);
    },

    async get(id) {
      const firestore = await getDb();
      const { doc, getDoc } = await import("firebase/firestore");
      const snap = await getDoc(doc(firestore, collectionName, id));
      if (!snap.exists()) return null;
      return mapper(snap.id, snap.data());
    },

    async create(input) {
      const firestore = await getDb();
      const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
      const docRef = await addDoc(collection(firestore, collectionName), {
        ...input,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    },

    async update(id, input) {
      const firestore = await getDb();
      const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
      await updateDoc(doc(firestore, collectionName, id), {
        ...input,
        updatedAt: serverTimestamp(),
      });
    },

    async remove(id) {
      const firestore = await getDb();
      const { doc, deleteDoc } = await import("firebase/firestore");
      await deleteDoc(doc(firestore, collectionName, id));
    },

    async queryByField(field, value) {
      const firestore = await getDb();
      const { collection, getDocs, query, where } = await import("firebase/firestore");
      const snap = await getDocs(query(collection(firestore, collectionName), where(field, "==", value)));
      return snap.docs
        .map((item) => mapper(item.id, item.data()))
        .filter(Boolean);
    },
  };
}

/**
 * @template T
 * @param {string} collection
 * @param {(id: string, data: Record<string, unknown>) => T | null} mapper
 */
export function createStore(collection, mapper) {
  if (isFirebaseMode()) {
    return createFirestoreStore(collection, mapper);
  }
  return createLocalStore(collection, mapper);
}
