import { Navigate, useParams } from "react-router-dom";
import AdminPortalAccessPage from "./AdminPortalAccessPage.jsx";
import AdminPortalRolesPage from "./AdminPortalRolesPage.jsx";
import AdminSystemSettingsSectionPage from "./AdminSystemSettingsSectionPage.jsx";
import {
  PORTAL_ACCESS_SETTINGS_PATH,
  USER_ROLES_SETTINGS_PATH,
} from "./AdminSystemSettingsLayout.jsx";
import { SYSTEM_SETTINGS_SECTIONS } from "../../lib/systemSettings.js";

export default function AdminSystemSettingsRouter() {
  const { sectionId } = useParams();

  if (sectionId === PORTAL_ACCESS_SETTINGS_PATH) {
    return <AdminPortalAccessPage embedded />;
  }

  if (sectionId === USER_ROLES_SETTINGS_PATH) {
    return <AdminPortalRolesPage embedded />;
  }

  if (SYSTEM_SETTINGS_SECTIONS.some((section) => section.id === sectionId)) {
    return <AdminSystemSettingsSectionPage />;
  }

  return <Navigate to={`/admin/settings/${SYSTEM_SETTINGS_SECTIONS[0].id}`} replace />;
}
