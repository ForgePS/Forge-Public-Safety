import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { assertFirebaseConfig, resolveFirebaseConfig } from "./firebaseConfig.js";

let _app = null;
let _auth = null;
let _db = null;
let _storage = null;

function init() {
  if (_app) return;
  const existing = getApps();
  if (existing.length) {
    _app = existing[0];
  } else {
    const config = resolveFirebaseConfig();
    assertFirebaseConfig(config);
    _app = initializeApp(config);
  }
  _auth = getAuth(_app);
  _db = getFirestore(_app);
  _storage = getStorage(_app);
}

export function getFirebaseApp() {
  init();
  return _app;
}

export function getDb() {
  init();
  return _db;
}

export function getFirebaseAuth() {
  init();
  return _auth;
}

export function getFirebaseStorage() {
  init();
  return _storage;
}

// Convenience re-exports used by dataStore dynamic import
export const db = { __brand: "lazy-db" };
export const auth = { __brand: "lazy-auth" };
export const storage = { __brand: "lazy-storage" };
export const firebaseApp = { __brand: "lazy-app" };
