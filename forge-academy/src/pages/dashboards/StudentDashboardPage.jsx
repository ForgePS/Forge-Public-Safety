import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader, { StatCard } from "../../components/PageHeader.jsx";
import PortalAnnouncementsPanel from "../../components/PortalAnnouncementsPanel.jsx";
import StudentAvailableClassesTable from "../../components/StudentAvailableClassesTable.jsx";
import { PORTAL_AUDIENCES } from "../../lib/portalAnnouncements.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { listOpenClassSessions, partitionClassSessionsByCampus, filterClassSessionsExcludingCompletedCourses } from "../../lib/classes.js";
import {
  REGISTRATION_STATUSES,
  listRegistrationsByStudent,
} from "../../lib/registrations.js";
import { getCompletedCourseIdsForStudent } from "../../lib/studentProfile.js";
import { getStudentForUser } from "../../lib/students.js";
import { getStudentCertificationSummary } from "../../lib/studentCertifications.js";

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [certSummary, setCertSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [classesLoading, setClassesLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setClassesLoading(true);
      try {
        const [student, openSessions] = await Promise.all([
          getStudentForUser(user),
          listOpenClassSessions(),
        ]);

        const completedCourseIds = student
          ? await getCompletedCourseIdsForStudent(student.id)
          : new Set();
        const availableSessions = filterClassSessionsExcludingCompletedCourses(
          openSessions,
          completedCourseIds,
        );

        if (active) {
          setAvailableClasses(availableSessions);
          setClassesLoading(false);
        }

        if (!student) {
          if (active) {
            setRegistrations([]);
            setCertSummary(null);
          }
          return;
        }

        const [rows, summary] = await Promise.all([
          listRegistrationsByStudent(student.id),
          getStudentCertificationSummary(student.id),
        ]);
        if (active) {
          setRegistrations(rows);
          setCertSummary(summary);
        }
      } catch {
        if (active) {
          setRegistrations([]);
          setAvailableClasses([]);
        }
      } finally {
        if (active) {
          setLoading(false);
          setClassesLoading(false);
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [user]);

  const { onCampus: onCampusClasses, offCampus: offCampusClasses } = useMemo(
    () => partitionClassSessionsByCampus(availableClasses),
    [availableClasses],
  );

  const upcomingCount = useMemo(
    () =>
      registrations.filter((registration) =>
        [REGISTRATION_STATUSES.ENROLLED, REGISTRATION_STATUSES.WAITLISTED].includes(
          registration.status,
        ),
      ).length,
    [registrations],
  );

  const pendingCount = useMemo(
    () =>
      registrations.filter((registration) =>
        [REGISTRATION_STATUSES.PENDING_DEPARTMENT, REGISTRATION_STATUSES.PENDING_ACADEMY].includes(
          registration.status,
        ),
      ).length,
    [registrations],
  );

  const nextClass = registrations.find(
    (registration) => registration.status === REGISTRATION_STATUSES.ENROLLED,
  );

  return (
    <>
      <PageHeader
        title="Student Dashboard"
        subtitle="My training"
        actions={
          <Link
            to="/student/register"
            className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
          >
            Register for class
          </Link>
        }
      />
      <div className="flex flex-1 flex-col gap-6 p-6 lg:p-7">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="On-Campus Classes"
            value={classesLoading ? "…" : onCampusClasses.length}
            sub="Open sessions at AFTA Camden"
          />
          <StatCard
            label="Off-Campus Classes"
            value={classesLoading ? "…" : offCampusClasses.length}
            sub="Regional offerings statewide"
          />
          <StatCard
            label="Upcoming Classes"
            value={loading ? "…" : upcomingCount}
            sub={nextClass ? `${nextClass.courseName} · ${nextClass.classStartDate}` : "No enrolled classes"}
          />
          <StatCard
            label="Pending Requests"
            value={loading ? "…" : pendingCount}
            sub="Awaiting department or academy approval"
            warn={pendingCount > 0}
          />
          <StatCard
            label="Active Certifications"
            value={loading ? "…" : (certSummary?.activeCount ?? 0)}
            sub={
              certSummary?.expiringCount
                ? `${certSummary.expiringCount} expiring within 60 days${
                    certSummary.nearestExpiryDays !== null
                      ? ` · next in ${certSummary.nearestExpiryDays} days`
                      : ""
                  }`
                : "Professional credentials on file"
            }
            warn={(certSummary?.expiringCount ?? 0) > 0}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <StudentAvailableClassesTable
              sessions={onCampusClasses}
              loading={classesLoading}
              title="On-campus classes"
              emptyMessage="No on-campus classes match your search."
            />
          </div>
          <PortalAnnouncementsPanel audience={PORTAL_AUDIENCES.STUDENT} />
        </div>

        <StudentAvailableClassesTable
          sessions={offCampusClasses}
          loading={classesLoading}
          title="Off-campus classes"
          emptyMessage="No off-campus classes match your search."
        />
      </div>
    </>
  );
}
