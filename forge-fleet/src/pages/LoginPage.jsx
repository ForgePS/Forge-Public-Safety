import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getStorageMode } from "../lib/dataStore.js";

export default function LoginPage() {
  const { user, ready, signIn, error } = useAuth();
  const [email, setEmail] = useState("admin@springfieldfd.gov");
  const [password, setPassword] = useState("demo");
  const [submitting, setSubmitting] = useState(false);
  const storageMode = getStorageMode();

  if (ready && user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    await signIn(email, password);
    setSubmitting(false);
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--color-fleet-bg)] px-4">
      <div className="app-panel w-full max-w-md p-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-fleet-muted)]">Forge Fleet</p>
        <h1 className="mt-1 text-xl font-bold text-[var(--color-fleet-text)]">Maintenance Module</h1>
        <p className="mt-2 text-sm text-[var(--color-fleet-muted)]">
          Equipment & apparatus maintenance management
          {storageMode === "local" ? " — Demo mode (local storage)" : ""}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="app-label">Email</span>
            <input className="app-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="block">
            <span className="app-label">Password</span>
            <input className="app-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          {storageMode === "local" ? (
            <p className="text-[11px] text-[var(--color-fleet-muted)]">Demo mode: any credentials work. Sample data loads automatically.</p>
          ) : null}
          <button type="submit" className="app-btn-primary w-full" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
