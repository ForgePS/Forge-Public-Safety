/**
 * Public Firebase web app config for forge-academy-95f84.
 * These values are safe to commit — they identify the client SDK, not grant admin access.
 * Override with VITE_FIREBASE_* in .env for forks or alternate projects.
 */
export const FORGE_ACADEMY_FIREBASE_DEFAULTS = {
  apiKey: "AIzaSyA4sJTryZWjVWNKx-pnurnBrFEdf0sxVpg",
  authDomain: "forge-academy-95f84.firebaseapp.com",
  projectId: "forge-academy-95f84",
  storageBucket: "forge-academy-95f84.firebasestorage.app",
  messagingSenderId: "906779545846",
  appId: "1:906779545846:web:16c5e7fc77f1823cb8dcd7",
};

function envOrDefault(envKey, fallback) {
  const value = import.meta.env[envKey];
  return value != null && value !== "" ? value : fallback;
}

export function resolveFirebaseConfig() {
  const defaults = FORGE_ACADEMY_FIREBASE_DEFAULTS;
  return {
    apiKey: envOrDefault("VITE_FIREBASE_API_KEY", defaults.apiKey),
    authDomain: envOrDefault("VITE_FIREBASE_AUTH_DOMAIN", defaults.authDomain),
    projectId: envOrDefault("VITE_FIREBASE_PROJECT_ID", defaults.projectId),
    storageBucket: envOrDefault(
      "VITE_FIREBASE_STORAGE_BUCKET",
      defaults.storageBucket,
    ),
    messagingSenderId: envOrDefault(
      "VITE_FIREBASE_MESSAGING_SENDER_ID",
      defaults.messagingSenderId,
    ),
    appId: envOrDefault("VITE_FIREBASE_APP_ID", defaults.appId),
  };
}

export function assertFirebaseConfig(config) {
  const required = ["apiKey", "authDomain", "projectId", "appId"];
  const missing = required.filter((key) => !config[key]);
  if (missing.length) {
    throw new Error(
      `Missing Firebase config: ${missing.join(", ")}. Copy .env.example to .env or set VITE_FIREBASE_* values.`,
    );
  }
}
