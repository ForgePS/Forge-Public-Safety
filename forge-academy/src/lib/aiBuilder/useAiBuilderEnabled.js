import { useSystemSettingsOptional } from "../../context/SystemSettingsContext.jsx";
import { isFullAdmin } from "../roles.js";
import { useAuth } from "../../context/AuthContext.jsx";

/**
 * @returns {boolean}
 */
export function useAiBuilderEnabled() {
  const settingsContext = useSystemSettingsOptional();
  const { profile } = useAuth();
  const settings = settingsContext?.settings;

  if (!isFullAdmin(profile?.role)) return false;
  if (!settings) return true;
  return settings.features?.aiBuilderEnabled !== false;
}
