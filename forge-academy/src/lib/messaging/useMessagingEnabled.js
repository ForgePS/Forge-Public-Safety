import { useAuth } from "../../context/AuthContext.jsx";
import { useSystemSettingsOptional } from "../../context/SystemSettingsContext.jsx";

export function useMessagingEnabled() {
  const settingsContext = useSystemSettingsOptional();
  const { user } = useAuth();
  const settings = settingsContext?.settings;

  if (!user?.uid) return false;
  if (!settings) return true;
  return settings.messaging?.enabled !== false;
}
