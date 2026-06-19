import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../lib/firebase.js";
import { fetchUserProfile, tryBootstrapAdminProfile } from "../lib/users.js";

/** @param {unknown} error */
export function getAuthErrorMessage(error) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return error instanceof Error ? error.message : "Sign in failed.";
  }

  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Wrong email or password.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled. Turn it on in Firebase Console → Authentication → Sign-in method.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "permission-denied":
      return "Signed in, but Firestore blocked your profile. Deploy the latest firestore rules to forge-academy-95f84.";
    default:
      return error instanceof Error ? error.message : "Sign in failed.";
  }
}

/** @type {import('react').Context<{
 *   user: import('../lib/users.js').AppUserRecord | null,
 *   ready: boolean,
 *   signingIn: boolean,
 *   error: string | null,
 *   signIn: (email: string, password: string) => Promise<boolean>,
 *   logOut: () => Promise<void>,
 * } | null>} */
const AuthContext = createContext(null);

const AUTH_BOOTSTRAP_TIMEOUT_MS = 12_000;
const PROFILE_FETCH_TIMEOUT_MS = 10_000;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    }),
  ]);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState(null);
  const profileRequestId = useRef(0);

  useEffect(() => {
    let authSettled = false;

    const bootstrapTimeoutId = window.setTimeout(() => {
      if (!authSettled) {
        setSigningIn(false);
        setReady(true);
      }
    }, AUTH_BOOTSTRAP_TIMEOUT_MS);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      authSettled = true;
      window.clearTimeout(bootstrapTimeoutId);

      const requestId = ++profileRequestId.current;

      if (!firebaseUser) {
        setUser(null);
        setSigningIn(false);
        setReady(true);
        return;
      }

      try {
        let profile = await withTimeout(
          fetchUserProfile(firebaseUser.uid),
          PROFILE_FETCH_TIMEOUT_MS,
          "Profile lookup",
        );

        if (!profile) {
          profile = await withTimeout(
            tryBootstrapAdminProfile(firebaseUser),
            PROFILE_FETCH_TIMEOUT_MS,
            "Admin bootstrap",
          );
        }

        if (requestId !== profileRequestId.current) return;

        if (!profile) {
          setError(
            "Your account is not configured for Forge Academy. Ask an admin to add a users/{uid} profile in Firestore.",
          );
          await signOut(auth);
          setUser(null);
        } else {
          setError(null);
          setUser(profile);
        }
      } catch (err) {
        if (requestId !== profileRequestId.current) return;
        setError(getAuthErrorMessage(err));
        setUser(null);
        await signOut(auth);
      } finally {
        if (requestId === profileRequestId.current) {
          setSigningIn(false);
          setReady(true);
        }
      }
    });

    return () => {
      window.clearTimeout(bootstrapTimeoutId);
      unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      signingIn,
      error,
      async signIn(email, password) {
        setSigningIn(true);
        setError(null);

        try {
          await signInWithEmailAndPassword(auth, email, password);
          return true;
        } catch (err) {
          setSigningIn(false);
          setError(getAuthErrorMessage(err));
          return false;
        }
      },
      async logOut() {
        setError(null);
        setSigningIn(false);
        await signOut(auth);
        setUser(null);
      },
    }),
    [user, ready, signingIn, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
