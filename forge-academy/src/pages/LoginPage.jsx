import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { homePathForRole, pathAllowedForRole } from "../lib/roles.js";

export default function LoginPage() {
  const { user, signIn, signingIn, error } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (signingIn) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--color-afta-bg)] text-[var(--color-afta-muted)]">
        Signing in…
      </div>
    );
  }

  if (user) {
    const home = homePathForRole(user.role);
    const requested = location.state?.from;
    const redirect =
      requested && pathAllowedForRole(user.role, requested) ? requested : home;
    return <Navigate to={redirect} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await signIn(email.trim(), password);
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--color-afta-bg)] px-4 py-10">
      <div className="w-full max-w-md rounded-[18px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <img src="/afta-logo.png" alt="" className="h-16 w-16 object-contain" />
          <div>
            <p className="text-base font-semibold text-[var(--color-afta-text)]">Forge Academy Management System</p>
            <p className="text-xs text-[var(--color-afta-muted)]">Arkansas Fire Training Academy · Camden</p>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-[var(--color-afta-text)]">Sign in</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-afta-muted)]">
          Statewide training, certification, and department compliance — one centralized platform.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold text-[var(--color-afta-muted)]">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={signingIn}
              className="w-full rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-afta-text)] outline-none focus:border-[var(--color-afta-red)]/50 disabled:opacity-60"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold text-[var(--color-afta-muted)]">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={signingIn}
              className="w-full rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-afta-text)] outline-none focus:border-[var(--color-afta-red)]/50 disabled:opacity-60"
            />
          </label>

          {error ? (
            <p className="rounded-[10px] border border-[var(--color-afta-red)]/30 bg-[var(--color-afta-red)]/10 px-3 py-2 text-sm text-[var(--color-afta-red)]">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={signingIn}
            className="w-full rounded-[10px] bg-[var(--color-afta-red)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {signingIn ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
