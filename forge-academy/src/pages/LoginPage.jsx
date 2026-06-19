import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";
import { ForgeOrgBadge, ForgeWordmark } from "../components/auth/ForgeLoginBrand.jsx";
import { ForgeLoginThemeToggle } from "../components/auth/ForgeLoginThemeToggle.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useForgeLoginTheme } from "../hooks/useForgeLoginTheme.js";
import { homePathForRole, pathAllowedForRole } from "../lib/roles.js";

const ACADEMY_HOSTING_URL = "forge-academy-95f84.web.app";

export default function LoginPage() {
  const { user, signIn, signingIn, error } = useAuth();
  const location = useLocation();
  const { theme, isDark, toggleTheme } = useForgeLoginTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (signingIn && !user) {
    return (
      <div
        className="forge-login-screen grid min-h-screen place-items-center"
        data-forge-login-theme={theme}
      >
        <p className="forge-login-muted">Signing in…</p>
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
    <div
      className="forge-login-screen flex min-h-screen flex-col items-center justify-center px-4 py-10"
      data-forge-login-theme={theme}
    >
      <div className="w-full max-w-[420px]">
        <ForgeLoginThemeToggle isDark={isDark} onToggle={toggleTheme} />
        <ForgeWordmark />

        <div className="forge-login-card mt-8 rounded-2xl border p-6 backdrop-blur-sm sm:p-8">
          <div className="mb-6">
            <ForgeOrgBadge
              logoAlt="Arkansas Fire Training Academy"
              title="Arkansas Fire Training Academy"
              subtitle="Forge Academy · Camden"
            />
          </div>

          <div className="mb-6 flex items-start gap-3">
            <span className="forge-login-shield grid h-10 w-10 shrink-0 place-items-center rounded-xl">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="forge-login-heading text-xl font-bold">Sign in</h1>
              <p className="forge-login-muted mt-1 text-xs">
                FORGE Academy · {ACADEMY_HOSTING_URL}
              </p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="forge-login-label mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em]">
                Email
              </span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={signingIn}
                placeholder="you@department.org"
                className="forge-login-input"
              />
            </label>

            <label className="block">
              <span className="forge-login-label mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em]">
                Password
              </span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={signingIn}
                placeholder="Minimum 6 characters"
                className="forge-login-input"
              />
            </label>

            {error ? (
              <p className="forge-login-error rounded-xl border px-3 py-2.5 text-sm">{error}</p>
            ) : null}

            <button type="submit" disabled={signingIn} className="forge-login-submit">
              {signingIn ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="forge-login-muted mt-5 text-center text-xs">
            Accounts are created by your academy or department administrator.
          </p>
        </div>

        <p className="forge-login-muted mt-6 text-center text-xs">
          Company website:{" "}
          <a
            href="https://forgepublicsafety.com"
            target="_blank"
            rel="noreferrer"
            className="forge-login-link font-semibold"
          >
            forgepublicsafety.com
          </a>
        </p>
      </div>
    </div>
  );
}
