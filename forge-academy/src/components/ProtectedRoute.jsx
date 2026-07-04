import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { usePortalRolesOptional } from "../context/PortalRolesContext.jsx";
import { usePortalDefinitionsOptional } from "../context/PortalDefinitionsContext.jsx";
import { useSystemSettingsOptional } from "../context/SystemSettingsContext.jsx";
import { resolveSafeHomePath } from "../lib/portalAccess.js";
import {
  isAdminPortalRole,
  isFullAdmin,
  roleAllowed,
  roleAllowedWithCustom,
} from "../lib/roles.js";

/**
 * @param {{ allowedRoles?: import('../lib/roles.js').Role | import('../lib/roles.js').Role[] }} props
 */
export default function ProtectedRoute({ allowedRoles }) {
  const { user, ready, signingIn } = useAuth();
  const portalRoles = usePortalRolesOptional();
  const portalDefs = usePortalDefinitionsOptional();
  const settingsContext = useSystemSettingsOptional();
  const location = useLocation();
  const customById = portalRoles?.customById ?? {};
  const settings = settingsContext?.settings;
  const customPortalsBySlug = portalDefs?.bySlug ?? {};

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

  if (
    allowedRoles &&
    !roleAllowed(user.role, allowedRoles) &&
    !roleAllowedWithCustom(user.role, allowedRoles, customById)
  ) {
    if (isFullAdmin(user.role) || isAdminPortalRole(user.role, customById)) {
      return <Navigate to={resolveSafeHomePath(user, customById, settings, customPortalsBySlug)} replace />;
    }
    return <Navigate to="/unauthorized" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function RoleRedirect() {
  const { user, ready, signingIn } = useAuth();
  const portalRoles = usePortalRolesOptional();
  const portalDefs = usePortalDefinitionsOptional();
  const settingsContext = useSystemSettingsOptional();
  const customById = portalRoles?.customById ?? {};
  const settings = settingsContext?.settings;
  const customPortalsBySlug = portalDefs?.bySlug ?? {};

  if (!ready || signingIn) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--color-afta-bg)] text-[var(--color-afta-subtle)]">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={resolveSafeHomePath(user, customById, settings, customPortalsBySlug)} replace />;
}
