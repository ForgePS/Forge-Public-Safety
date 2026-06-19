import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader, { StatCard } from "../../components/PageHeader.jsx";
import PortalAnnouncementsPanel from "../../components/PortalAnnouncementsPanel.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { PORTAL_AUDIENCES } from "../../lib/portalAnnouncements.js";
import { countIncompleteAttendanceForInstructor } from "../../lib/attendance.js";
import {
  getInstructorAnalytics,
  getUpcomingAssignments,
  listAssignmentsByInstructorUserId,
} from "../../lib/instructorAssignments.js";
import { getInstructorByUserId } from "../../lib/instructors.js";

export default function InstructorDashboardPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [attendanceNeeded, setAttendanceNeeded] = useState(0);
  const [hasProfile, setHasProfile] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    let active = true;

    async function load() {
      try {
        const [profile, rows, incompleteCount] = await Promise.all([
          getInstructorByUserId(user.uid),
          listAssignmentsByInstructorUserId(user.uid),
          countIncompleteAttendanceForInstructor(user.uid),
        ]);
        if (!active) return;
        setHasProfile(Boolean(profile));
        setAssignments(rows);
        setAttendanceNeeded(incompleteCount);
      } catch {
        // Keep dashboard usable on failure.
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [user?.uid]);

  const analytics = useMemo(() => getInstructorAnalytics(assignments), [assignments]);
  const nextAssignment = useMemo(() => getUpcomingAssignments(assignments)[0], [assignments]);

  return (
    <>
      <PageHeader
        title="Instructor Dashboard"
        subtitle="Assignments, attendance, and teaching workload"
        actions={
          <Link
            to="/instructor/schedule"
            className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
          >
            View schedule
          </Link>
        }
      />
      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {!hasProfile ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            Your login is not linked to an instructor profile yet. Ask an administrator to set this up under
            Admin → Instructors.
          </p>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-3">
          <div className="grid gap-4 sm:grid-cols-2 xl:col-span-2 xl:grid-cols-2">
            <StatCard
              label="Upcoming Assignments"
              value={analytics.upcoming}
              sub={nextAssignment ? `${nextAssignment.courseName} · ${nextAssignment.startDate}` : "No upcoming classes"}
            />
            <StatCard
              label="Attendance Needed"
              value={attendanceNeeded}
              sub="Days missing finalized attendance"
              warn={attendanceNeeded > 0}
            />
            <StatCard label="Classes Taught" value={analytics.completed} sub="Teaching history" />
            <StatCard label="Total Assignments" value={analytics.total} sub="Scheduled and completed" />
          </div>
          <PortalAnnouncementsPanel audience={PORTAL_AUDIENCES.INSTRUCTOR} />
        </div>
      </div>
    </>
  );
}
