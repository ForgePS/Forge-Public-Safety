import PortalAnnouncementsManager from "../../components/PortalAnnouncementsManager.jsx";
import {
  PORTAL_AUDIENCE_OPTIONS,
  PORTAL_AUDIENCES,
  listAllPortalAnnouncements,
} from "../../lib/portalAnnouncements.js";

export default function AdminPortalAnnouncementsPage() {
  return (
    <PortalAnnouncementsManager
      title="Portal Announcements"
      subtitle="Publish updates to admin, student, instructor, department, and certification portals"
      audienceOptions={PORTAL_AUDIENCE_OPTIONS}
      defaultAudiences={[PORTAL_AUDIENCES.ADMIN]}
      loadAnnouncements={listAllPortalAnnouncements}
    />
  );
}
