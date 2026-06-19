import { useEffect } from "react";
import { usePortalTheme } from "../context/PortalThemeContext.jsx";

/** Login shell theme — shared with portal dashboards. */
export function useForgeLoginTheme() {
  const { theme, isDark, toggleTheme } = usePortalTheme();

  useEffect(() => {
    document.body.classList.add("forge-login-active");
    document.body.dataset.forgeLoginTheme = theme;
    return () => {
      document.body.classList.remove("forge-login-active");
      delete document.body.dataset.forgeLoginTheme;
    };
  }, [theme]);

  return {
    theme,
    isDark,
    toggleTheme,
  };
}
