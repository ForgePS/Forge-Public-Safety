import { Link, Outlet, useLocation } from "react-router-dom";
import { useSystemSettingsOptional } from "../context/SystemSettingsContext.jsx";
import { isFullAdmin } from "../lib/roles.js";
import { useAuth } from "../context/AuthContext.jsx";
import { getPortalAccessConfig, isPortalAccessEnabled } from "../lib/portalAccess.js";

/**
 * @param {{ portal: import('../lib/portalAccess.js').PortalAccessKey, homePath?: string }} props
 */
export default function PortalAccessGuard({ portal, homePath }) {
  const location = useLocation();
  const { user } = useAuth();
  const settingsContext = useSystemSettingsOptional();
  const settings = settingsContext?.settings;

  if (!settings || settingsContext?.loading) {
    return <Outlet />;
  }

  if (isPortalAccessEnabled(settings, portal)) {
    return <Outlet />;
  }

  const config = getPortalAccessConfig(settings, portal);
  const backPath = homePath ?? "/login";
  const canManage = isFullAdmin(user?.role);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="app-panel max-w-lg p-8 text-center">
        <h2 className="text-lg font-semibold text-[var(--color-afta-text)]">{config.label} unavailable</h2>
        <p className="mt-3 text-sm text-[var(--color-afta-subtle)]">
          {config.signInMessage || "This portal has been turned off in Portal Access settings."}
        </p>
        {canManage ? (
          <Link to="/admin/portal-access" className="app-btn-primary mt-6 inline-block px-4 py-2 text-xs">
            Manage portal access
          </Link>
        ) : (
          <Link to={backPath} className="app-btn-primary mt-6 inline-block px-4 py-2 text-xs">
            Back to sign in
          </Link>
        )}
        <p className="mt-4 text-xs text-[var(--color-afta-muted)]">{location.pathname}</p>
      </div>
    </div>
  );
}
