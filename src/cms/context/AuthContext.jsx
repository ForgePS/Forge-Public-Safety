import { createContext, useContext, useEffect, useState } from "react";
import { getFirebaseAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, isFirebaseConfigured } from "../store/firebase.js";
import { getLocalStore } from "../store/localStore.js";
import { hasPermission } from "../core/permissions.js";

const AuthContext = createContext(null);

const DEV_ADMIN = { uid: "local-admin", email: "admin@local.dev", role: "super_admin", name: "Local Admin" };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      const session = sessionStorage.getItem("cms_admin_session");
      if (session) {
        try { setUser(JSON.parse(session)); } catch { /* ignore */ }
      }
      setLoading(false);
      return;
    }
    const auth = getFirebaseAuth();
    if (!auth) { setLoading(false); return; }
    return onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const store = getLocalStore();
        const cmsUser = store.users?.find((u) => u.email === fbUser.email) || { role: "read_only", email: fbUser.email, name: fbUser.displayName || fbUser.email };
        setUser({ uid: fbUser.uid, email: fbUser.email, ...cmsUser });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
  }, []);

  const login = async (email, password) => {
    if (!isFirebaseConfigured()) {
      const store = getLocalStore();
      const cmsUser = store.users?.find((u) => u.email === email);
      if (email && password === "admin") {
        const u = cmsUser || { ...DEV_ADMIN, email };
        sessionStorage.setItem("cms_admin_session", JSON.stringify(u));
        setUser(u);
        return u;
      }
      throw new Error("Invalid credentials. Use password 'admin' for local dev.");
    }
    const auth = getFirebaseAuth();
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  };

  const logout = async () => {
    sessionStorage.removeItem("cms_admin_session");
    if (isFirebaseConfigured()) {
      await signOut(getFirebaseAuth());
    }
    setUser(null);
  };

  const can = (permission) => {
    if (!user) return false;
    const store = getLocalStore();
    return hasPermission(user.role, permission, store.roles);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can, isAuthenticated: Boolean(user) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
