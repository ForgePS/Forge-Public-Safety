import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { isFirebaseMode } from "../lib/dataStore.js";
import { seedDemoData } from "../lib/seedData.js";

/** @type {import('react').Context<{ user: { uid: string, displayName: string, role: string } | null, ready: boolean, signIn: (email: string, password: string) => Promise<boolean>, logOut: () => Promise<void>, error: string | null } | null>} */
const AuthContext = createContext(null);

const LOCAL_USER_KEY = "forge-fleet:user";

function getLocalUser() {
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setLocalUser(user) {
  if (user) {
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(LOCAL_USER_KEY);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function init() {
      if (!isFirebaseMode()) {
        await seedDemoData();
        setUser(getLocalUser());
        setReady(true);
        return;
      }

      try {
        const { getFirebaseAuth } = await import("../lib/firebase.js");
        const { onAuthStateChanged } = await import("firebase/auth");
        onAuthStateChanged(getFirebaseAuth(), (firebaseUser) => {
          if (firebaseUser) {
            setUser({
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || firebaseUser.email || "User",
              role: "admin",
            });
          } else {
            setUser(null);
          }
          setReady(true);
        });
      } catch (err) {
        console.error("Firebase auth init failed:", err);
        await seedDemoData();
        setUser(getLocalUser());
        setReady(true);
      }
    }
    init();
  }, []);

  const value = useMemo(() => ({
    user,
    ready,
    error,
    async signIn(email, password) {
      setError(null);
      if (!isFirebaseMode()) {
        const demoUser = {
          uid: "demo-admin",
          displayName: email.split("@")[0] || "Demo Admin",
          role: "admin",
        };
        setLocalUser(demoUser);
        setUser(demoUser);
        return true;
      }
      try {
        const { getFirebaseAuth } = await import("../lib/firebase.js");
        const { signInWithEmailAndPassword } = await import("firebase/auth");
        await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sign in failed.");
        return false;
      }
    },
    async logOut() {
      if (!isFirebaseMode()) {
        setLocalUser(null);
        setUser(null);
        return;
      }
      const { getFirebaseAuth } = await import("../lib/firebase.js");
      const { signOut } = await import("firebase/auth");
      await signOut(getFirebaseAuth());
      setUser(null);
    },
  }), [user, ready, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
