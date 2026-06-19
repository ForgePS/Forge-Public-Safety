import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { homePathForRole, isFullAdmin, roleAllowed } from "../lib/roles.js";

/**
 * @param {{ allowedRoles?: import('../lib/roles.js').Role | import('../lib/roles.js').Role[] }} props
 */
export default function ProtectedRoute({ allowedRoles }) {
  const { user, ready, signingIn } = useAuth();
  const location = useLocation();

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

  if (allowedRoles && !roleAllowed(user.role, allowedRoles)) {
    if (isFullAdmin(user.role)) {
      return <Navigate to={homePathForRole(user.role)} replace />;
    }
    return <Navigate to="/unauthorized" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function RoleRedirect() {
  const { user, ready, signingIn } = useAuth();

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

  return <Navigate to={homePathForRole(user.role)} replace />;
}
