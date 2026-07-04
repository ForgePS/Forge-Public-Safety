const PORTAL_HOME_PATHS = new Set([
  "/",
  "/login",
  "/admin",
  "/student",
  "/department",
  "/instructor",
  "/certification",
  "/unauthorized",
]);

/** @param {string} pathname */
export function isPortalHomePath(pathname) {
  return PORTAL_HOME_PATHS.has(pathname);
}

/**
 * Best-effort parent route when browser history is unavailable.
 * @param {string} pathname
 */
export function defaultBackTarget(pathname) {
  if (!pathname || pathname === "/") return "/login";

  const clean = pathname.split("?")[0].split("#")[0];
  if (isPortalHomePath(clean)) return clean;

  const segments = clean.split("/").filter(Boolean);
  if (segments.length <= 1) return `/${segments[0] ?? ""}`;

  segments.pop();
  return `/${segments.join("/")}`;
}

/**
 * @param {string} pathname
 * @returns {string | null}
 */
export function portalHomeForPath(pathname) {
  const clean = pathname.split("?")[0].split("#")[0];
  if (clean.startsWith("/admin")) return "/admin";
  if (clean.startsWith("/student")) return "/student";
  if (clean.startsWith("/department")) return "/department";
  if (clean.startsWith("/instructor")) return "/instructor";
  if (clean.startsWith("/certification")) return "/certification";
  return null;
}
