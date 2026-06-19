import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_LABELS } from "../lib/roles.js";
import NotificationBell from "./NotificationBell.jsx";
import PortalThemeToggle from "./PortalThemeToggle.jsx";

function formatToday() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * @param {{ portalTitle?: string }} props
 */
export default function DashboardTopBar({ portalTitle = "Arkansas Fire Training Academy Dashboard" }) {
  const { user, logOut } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.displayName?.split(" ")[0] ?? "User";

  async function handleSignOut() {
    await logOut();
    navigate("/login");
  }

  return (
    <div className="no-print flex flex-col gap-3 border-b border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] px-6 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-7">
      <div>
        <p className="text-sm font-semibold text-[var(--color-afta-text)]">Welcome, {firstName}</p>
        <p className="mt-0.5 text-xs text-[var(--color-afta-muted)]">{portalTitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <p className="hidden text-xs text-[var(--color-afta-muted)] sm:block">{formatToday()}</p>
        <NotificationBell />
        <div className="rounded-lg border border-[var(--color-afta-border)] px-3 py-2">
          <p className="text-xs font-semibold text-[var(--color-afta-text)]">{user?.displayName || user?.email}</p>
          <p className="text-[10px] text-[var(--color-afta-muted)]">
            {user ? ROLE_LABELS[user.role] : ""}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <PortalThemeToggle compact />
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[var(--color-afta-muted)] transition hover:text-[var(--color-afta-red)]"
            >
              <LogOut className="h-3 w-3" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
