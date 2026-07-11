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
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
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
  if (!getFirebaseApp()) return null;
  if (!db) db = getFirestore(getFirebaseApp());
  return db;
}

export function getFirebaseAuth() {
  if (!getFirebaseApp()) return null;
  if (!auth) auth = getAuth(getFirebaseApp());
  return auth;
}

export function getFirebaseStorage() {
  if (!getFirebaseApp()) return null;
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

export async function uploadMediaFile(file, path) {
  const store = getFirebaseStorage();
  if (!store) throw new Error("Firebase Storage not configured");
  const storageRef = ref(store, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function deleteMediaFile(path) {
  const store = getFirebaseStorage();
  if (!store) return;
  await deleteObject(ref(store, path));
}

export { signInWithEmailAndPassword, signOut, onAuthStateChanged };
