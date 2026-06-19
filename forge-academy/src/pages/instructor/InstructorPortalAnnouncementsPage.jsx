import PortalAnnouncementsManager from "../../components/PortalAnnouncementsManager.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  INSTRUCTOR_ANNOUNCEMENT_AUDIENCE_OPTIONS,
  PORTAL_AUDIENCES,
  canInstructorEditAnnouncement,
  listInstructorManagedAnnouncements,
} from "../../lib/portalAnnouncements.js";

export default function InstructorPortalAnnouncementsPage() {
  const { user } = useAuth();

  return (
    <PortalAnnouncementsManager
      title="Announcements"
      subtitle="Publish updates to student and instructor dashboards"
      audienceOptions={INSTRUCTOR_ANNOUNCEMENT_AUDIENCE_OPTIONS}
      defaultAudiences={[PORTAL_AUDIENCES.STUDENT]}
      loadAnnouncements={() => listInstructorManagedAnnouncements(user?.uid)}
      canManageItem={(item) => canInstructorEditAnnouncement(item, user?.uid)}
      showAudienceSummary={false}
      showAudiencePicker
      listTitle="Your announcements"
      author={
        user?.uid
          ? { uid: user.uid, displayName: user.displayName || user.email || "Instructor" }
          : null
      }
    />
  );
}
