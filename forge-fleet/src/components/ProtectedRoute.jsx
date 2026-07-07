import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute() {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-[var(--color-fleet-muted)]">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
