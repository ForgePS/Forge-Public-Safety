import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_HOME_PATHS, ROLE_LABELS, homePathForRole } from "../lib/roles.js";

const PORTAL_LINKS = [
  { label: "Academy Admin", path: ROLE_HOME_PATHS.academy_admin },
  { label: "Student Portal", path: ROLE_HOME_PATHS.student },
  { label: "Department Portal", path: ROLE_HOME_PATHS.department_training_officer },
  { label: "Instructor Portal", path: ROLE_HOME_PATHS.instructor },
  { label: "Certification Portal", path: ROLE_HOME_PATHS.certification_officer },
];

export default function UnauthorizedPage() {
  const { user, logOut } = useAuth();
  const location = useLocation();
  const deniedPath = location.state?.from;
  const home = user ? homePathForRole(user.role) : "/login";
  const roleLabel = user ? (ROLE_LABELS[user.role] ?? user.role) : null;

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--color-afta-bg)] px-4 py-10">
      <div className="max-w-lg rounded-[18px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] p-8">
        <h1 className="text-xl font-semibold text-[var(--color-afta-text)]">Access denied</h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-afta-subtle)]">
          Your account does not have permission to view that page.
          {roleLabel ? (
            <>
              {" "}
              You are signed in as <span className="text-[var(--color-afta-text)]">{roleLabel}</span>.
            </>
          ) : null}
        </p>

        {deniedPath ? (
          <p className="mt-3 rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2 text-xs text-[var(--color-afta-subtle)]">
            Blocked URL: <span className="font-mono text-[var(--color-afta-text)]">{deniedPath}</span>
          </p>
        ) : null}

        <div className="mt-5 space-y-2 text-sm text-[var(--color-afta-subtle)]">
          <p className="font-semibold text-[var(--color-afta-text)]">Your dashboard</p>
          <Link to={home} className="inline-flex text-[#c8102e] hover:text-[var(--color-afta-text)]">
            {home}
          </Link>
        </div>

        {user ? (
          <div className="mt-5 space-y-2 text-sm text-[var(--color-afta-subtle)]">
            <p className="font-semibold text-[var(--color-afta-text)]">Portal entry points</p>
            <ul className="space-y-1">
              {PORTAL_LINKS.map((portal) => (
                <li key={portal.path}>
                  <Link
                    to={portal.path}
                    className={
                      portal.path === home
                        ? "font-semibold text-[#c8102e] hover:text-[var(--color-afta-text)]"
                        : "text-[var(--color-afta-muted)] hover:text-[var(--color-afta-text)]"
                    }
                  >
                    {portal.label} — {portal.path}
                  </Link>
                </li>
              ))}
            </ul>
            {roleLabel === "Academy Admin" || roleLabel === "Super Admin" || roleLabel === "Creator" ? (
              <p className="text-xs">
                Admin accounts open the academy dashboard at{" "}
                <Link to="/admin" className="text-[#c8102e] hover:text-[var(--color-afta-text)]">
                  /admin
                </Link>
                . Use the links below only if you also have another portal role assigned.
              </p>
            ) : (
              <p className="text-xs">
                To manage departments, sign in with an Academy Admin account or ask an admin to
                update your Firestore `users` profile role.
              </p>
            )}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to={home}
            className="inline-block rounded-[10px] bg-[#c8102e] px-4 py-2 text-sm font-bold text-white"
          >
            Go to my dashboard
          </Link>
          {user ? (
            <button
              type="button"
              onClick={() => logOut()}
              className="rounded-[10px] border border-[var(--color-afta-border)] px-4 py-2 text-sm font-semibold text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)]"
            >
              Sign out
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
