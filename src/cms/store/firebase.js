import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import {
  getAuth,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

function env(name) {
  const value = import.meta.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

const firebaseConfig = {
  apiKey: env("VITE_FIREBASE_API_KEY"),
  authDomain: env("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: env("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: env("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: env("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: env("VITE_FIREBASE_APP_ID"),
};

/** True when web SDK keys are present (Storage and/or Auth can work). */
export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

/** Prefer Storage for media uploads when bucket is configured. */
export function isFirebaseStorageConfigured() {
  return isFirebaseConfigured() && Boolean(firebaseConfig.storageBucket);
}

/**
 * Firestore as CMS backend is opt-in.
 * Default stays localStorage for pages so enabling Storage alone won't blank the site.
 */
export function useFirestoreBackend() {
  if (!isFirebaseConfigured()) return false;
  return String(env("VITE_FIREBASE_USE_FIRESTORE") || "").toLowerCase() === "true";
}

export function getFirebaseClientConfig() {
  return { ...firebaseConfig };
}

export function getFirebaseStatus() {
  return {
    configured: isFirebaseConfigured(),
    storage: isFirebaseStorageConfigured(),
    firestore: useFirestoreBackend(),
    projectId: firebaseConfig.projectId || null,
    storageBucket: firebaseConfig.storageBucket || null,
  };
}

let app = null;
let db = null;
let auth = null;
let storage = null;

export function getFirebaseApp() {
  if (!isFirebaseConfigured()) return null;
  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  }
  return app;
}

export function getDb() {
  if (!getFirebaseApp() || !useFirestoreBackend()) return null;
  if (!db) db = getFirestore(getFirebaseApp());
  return db;
}

export function getFirebaseAuth() {
  if (!getFirebaseApp()) return null;
  if (!auth) auth = getAuth(getFirebaseApp());
  return auth;
}

export function getFirebaseStorage() {
  if (!getFirebaseApp() || !isFirebaseStorageConfigured()) return null;
  if (!storage) storage = getStorage(getFirebaseApp());
  return storage;
}

export async function firestoreGetCollection(colName) {
  const database = getDb();
  if (!database) return [];
  const snap = await getDocs(collection(database, colName));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function firestoreGetDoc(colName, id) {
  const database = getDb();
  if (!database) return null;
  const snap = await getDoc(doc(database, colName, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function firestoreSetDoc(colName, id, data) {
  const database = getDb();
  if (!database) return null;
  const payload = { ...data, updatedAt: new Date().toISOString() };
  await setDoc(doc(database, colName, id), payload, { merge: true });
  return { id, ...payload };
}

export async function firestoreDeleteDoc(colName, id) {
  const database = getDb();
  if (!database) return;
  await deleteDoc(doc(database, colName, id));
}

export async function firestoreQuery(colName, field, value) {
  const database = getDb();
  if (!database) return [];
  const q = query(collection(database, colName), where(field, "==", value));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function firestoreGetBySlug(colName, slug) {
  const results = await firestoreQuery(colName, "slug", slug);
  return results[0] || null;
}

export function firestoreSubscribe(colName, callback, orderField = "updatedAt") {
  const database = getDb();
  if (!database) return () => {};
  const q = query(collection(database, colName), orderBy(orderField, "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/** Ensure we can write to Storage (anonymous auth if needed). */
export async function ensureStorageUploadAuth() {
  const authClient = getFirebaseAuth();
  if (!authClient) {
    throw new Error("Firebase Auth is not configured. Set VITE_FIREBASE_* in .env.local and rebuild.");
  }
  if (authClient.currentUser) return authClient.currentUser;
  try {
    const cred = await signInAnonymously(authClient);
    return cred.user;
  } catch (err) {
    const message = String(err?.message || err);
    if (/admin-restricted-operation|operation-not-allowed/i.test(message)) {
      throw new Error(
        "Enable Anonymous sign-in in Firebase Console → Authentication → Sign-in method, then try again."
      );
    }
    throw err;
  }
}

export async function uploadMediaFile(file, path) {
  const store = getFirebaseStorage();
  if (!store) {
    throw new Error(
      "Firebase Storage is not configured. Set VITE_FIREBASE_STORAGE_BUCKET (and other VITE_FIREBASE_* keys), then rebuild/redeploy."
    );
  }
  await ensureStorageUploadAuth();
  const storageRef = ref(store, path);
  await uploadBytes(storageRef, file, {
    contentType: file.type || "application/octet-stream",
    cacheControl: "public,max-age=31536000",
  });
  return getDownloadURL(storageRef);
}

export async function deleteMediaFile(path) {
  const store = getFirebaseStorage();
  if (!store) return;
  await deleteObject(ref(store, path));
}

export { signInWithEmailAndPassword, signOut, onAuthStateChanged, signInAnonymously };
