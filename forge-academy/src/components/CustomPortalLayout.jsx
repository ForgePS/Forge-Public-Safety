import { Link, Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { usePortalDefinitionsOptional } from "../context/PortalDefinitionsContext.jsx";
import { usePortalRolesOptional } from "../context/PortalRolesContext.jsx";
import { customPortalPath } from "../lib/portalDefinitions.js";
import { pathAllowedForRole, isFullAdmin } from "../lib/roles.js";

export default function CustomPortalLayout() {
  const { portalSlug } = useParams();
  const location = useLocation();
  const { user, ready, signingIn } = useAuth();
  const portalDefs = usePortalDefinitionsOptional();
  const portalRoles = usePortalRolesOptional();
  const customById = portalRoles?.customById ?? {};
  const bySlug = portalDefs?.bySlug ?? {};

  if (!portalSlug) {
    return <Navigate to="/login" replace />;
  }

  if (portalDefs?.loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--color-afta-bg)] text-[var(--color-afta-subtle)]">
        Loading…
      </div>
    );
  }

  const portal = bySlug[portalSlug];
  const basePath = customPortalPath(portalSlug);

  if (!portal) {
    return <Navigate to="/unauthorized" replace state={{ from: location.pathname }} />;
  }

  if (!ready || signingIn) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--color-afta-bg)] text-[var(--color-afta-subtle)]">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const canAccess =
    isFullAdmin(user.role) || pathAllowedForRole(user.role, basePath, customById, bySlug);

  if (!canAccess) {
    return <Navigate to="/unauthorized" replace state={{ from: location.pathname }} />;
  }

  if (portal.enabled === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="app-panel max-w-lg p-8 text-center">
          <h2 className="text-lg font-semibold text-[var(--color-afta-text)]">{portal.label} unavailable</h2>
          <p className="mt-3 text-sm text-[var(--color-afta-subtle)]">
            {portal.signInMessage || "This portal has been turned off in Portal Access settings."}
          </p>
          {isFullAdmin(user.role) ? (
            <Link to="/admin/portal-access" className="app-btn-primary mt-6 inline-block px-4 py-2 text-xs">
              Manage portal access
            </Link>
          ) : (
            <Link to="/login" className="app-btn-primary mt-6 inline-block px-4 py-2 text-xs">
              Back to sign in
            </Link>
          )}
        </div>
      </div>
    );
  }

  return <Outlet />;
}
