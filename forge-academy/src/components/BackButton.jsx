import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { defaultBackTarget, isPortalHomePath, portalHomeForPath } from "../lib/navigationBack.js";

/**
 * @param {{
 *   to?: string,
 *   label?: string,
 *   hideOnHome?: boolean,
 *   className?: string,
 * }} props
 */
export default function BackButton({
  to,
  label = "Back",
  hideOnHome = true,
  className = "inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-afta-muted)] hover:text-[#c8102e]",
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  if (hideOnHome && isPortalHomePath(pathname) && !to) {
    return null;
  }

  if (to) {
    return (
      <Link to={to} className={className}>
        <ArrowLeft className="h-3.5 w-3.5" />
        {label}
      </Link>
    );
  }

  function handleBack() {
    const fallback = defaultBackTarget(pathname);
    const portalHome = portalHomeForPath(pathname);

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(fallback || portalHome || "/login");
  }

  return (
    <button type="button" onClick={handleBack} className={className}>
      <ArrowLeft className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
