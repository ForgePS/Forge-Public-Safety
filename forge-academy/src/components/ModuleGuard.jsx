import { Link, Outlet, useLocation } from "react-router-dom";
import { useSystemSettingsOptional } from "../context/SystemSettingsContext.jsx";
import { isPortalPathAllowed, MODULE_LABELS } from "../lib/moduleAccess.js";

/**
 * @param {{ portal: "admin" | "student" | "department" | "instructor" | "certification", homePath?: string }} props
 */
export default function ModuleGuard({ portal, homePath }) {
  const location = useLocation();
  const settingsContext = useSystemSettingsOptional();
  const settings = settingsContext?.settings;

  if (!settings || settingsContext?.loading) {
    return <Outlet />;
  }

  if (isPortalPathAllowed(settings, location.pathname, portal)) {
    return <Outlet />;
  }

  const rule = resolveDisabledLabel(location.pathname, portal);
  const backPath = homePath ?? defaultHome(portal);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="app-panel max-w-lg p-8 text-center">
        <h2 className="text-lg font-semibold text-[var(--color-afta-text)]">Module unavailable</h2>
        <p className="mt-3 text-sm text-[var(--color-afta-subtle)]">
          {rule} is turned off in system settings. Contact a Creator or Super Admin if you need access.
        </p>
        <Link to={backPath} className="app-btn-primary mt-6 inline-block px-4 py-2 text-xs">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

function defaultHome(portal) {
  switch (portal) {
    case "admin":
      return "/admin";
    case "student":
      return "/student";
    case "department":
      return "/department";
    case "instructor":
      return "/instructor";
    case "certification":
      return "/certification";
    default:
      return "/";
  }
}

function resolveDisabledLabel(pathname, portal) {
  if (pathname.includes("/testing")) return MODULE_LABELS.testing;
  if (pathname.includes("/housing")) return MODULE_LABELS.housing;
  if (pathname.includes("/certificates")) return MODULE_LABELS.certificates;
  if (pathname.includes("/certification")) return MODULE_LABELS.certifications;
  if (pathname.includes("/skills")) return MODULE_LABELS.skills;
  if (pathname.includes("/departments") || portal === "department") return MODULE_LABELS.departments;
  if (pathname.includes("/reports")) return MODULE_LABELS.reports;
  if (pathname.includes("/registrations") || pathname.includes("/register")) return MODULE_LABELS.registration;
  return "This feature";
}

export function VerifyModuleGuard({ children }) {
  const settingsContext = useSystemSettingsOptional();
  const settings = settingsContext?.settings;

  if (!settings || settingsContext?.loading) {
    return children;
  }

  if (settings.certificates?.publicVerifyEnabled !== false) {
    return children;
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--color-afta-bg)] p-6">
      <div className="app-panel max-w-lg p-8 text-center">
        <h1 className="text-lg font-semibold text-[var(--color-afta-text)]">Verification unavailable</h1>
        <p className="mt-3 text-sm text-[var(--color-afta-subtle)]">
          Public certificate verification is disabled in system settings.
        </p>
      </div>
    </div>
  );
}
