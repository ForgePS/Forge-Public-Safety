import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "forge-portal-theme";
const LEGACY_LOGIN_KEY = "forge-login-theme";

/** @typedef {"light" | "dark"} PortalTheme */

/** @type {import('react').Context<{
 *   theme: PortalTheme,
 *   isDark: boolean,
 *   setTheme: (theme: PortalTheme) => void,
 *   toggleTheme: () => void,
 * } | null>} */
const PortalThemeContext = createContext(null);

/** @returns {PortalTheme} */
function readStoredTheme() {
  if (typeof window === "undefined") return "light";

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;

  const legacy = window.localStorage.getItem(LEGACY_LOGIN_KEY);
  if (legacy === "light" || legacy === "dark") return legacy;

  return "light";
}

if (typeof document !== "undefined") {
  document.documentElement.dataset.portalTheme = readStoredTheme();
}

export function PortalThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, theme);
    document.documentElement.dataset.portalTheme = theme;
    return () => {
      delete document.documentElement.dataset.portalTheme;
    };
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      setTheme: setThemeState,
      toggleTheme() {
        setThemeState((current) => (current === "dark" ? "light" : "dark"));
      },
    }),
    [theme],
  );

  return <PortalThemeContext.Provider value={value}>{children}</PortalThemeContext.Provider>;
}

export function usePortalTheme() {
  const context = useContext(PortalThemeContext);
  if (!context) {
    throw new Error("usePortalTheme must be used within PortalThemeProvider");
  }
  return context;
}
