import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useSystemSettingsOptional } from "../context/SystemSettingsContext.jsx";
import { isSystemSettingsAdmin } from "../lib/roles.js";

export default function MaintenanceGate({ children }) {
  const { user, ready } = useAuth();
  const settingsContext = useSystemSettingsOptional();
  const location = useLocation();

  const maintenanceMode = Boolean(settingsContext?.settings?.features?.maintenanceMode);
  const maintenanceMessage =
    settingsContext?.settings?.features?.maintenanceMessage ??
    "The portal is temporarily unavailable for scheduled maintenance.";

  if (!ready || settingsContext?.loading) {
    return children;
  }

  if (!maintenanceMode) {
    return children;
  }

  if (isSystemSettingsAdmin(user?.role)) {
    return children;
  }

  if (location.pathname === "/login") {
    return children;
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--color-afta-bg)] p-6">
      <div className="app-panel max-w-lg p-8 text-center">
        <h1 className="text-lg font-semibold text-[var(--color-afta-text)]">Maintenance in progress</h1>
        <p className="mt-3 text-sm text-[var(--color-afta-subtle)]">{maintenanceMessage}</p>
        <Link to="/login" className="app-btn-primary mt-6 inline-block px-4 py-2 text-xs">
          Sign in
        </Link>
      </div>
    </div>
  );
}

export function SystemSettingsRoute({ children }) {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--color-afta-bg)] text-[var(--color-afta-subtle)]">
        Loading…
      </div>
    );
  }

  if (!isSystemSettingsAdmin(user?.role)) {
    return (
      <div className="p-7">
        <h2 className="text-lg font-semibold text-[var(--color-afta-text)]">Access denied</h2>
        <p className="mt-2 text-sm text-[var(--color-afta-subtle)]">
          System settings are restricted to Creator and Super Admin accounts.
        </p>
        <Link to="/admin" className="app-btn-secondary mt-4 inline-block px-4 py-2 text-xs">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return children;
}
