import { useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { getClassSession } from "../../lib/classes.js";
import { getHousingSettings } from "../../lib/housingSettings.js";
import { listAssignmentsByStudent } from "../../lib/roomAssignments.js";
import { ASSIGNMENT_STATUS_LABELS } from "../../lib/roomAssignments.js";
import { getStudentForUser } from "../../lib/students.js";

export default function StudentHousingPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [classDetails, setClassDetails] = useState({});
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const student = await getStudentForUser(user);
        if (!student) {
          if (active) setAssignments([]);
          return;
        }

        const [rows, housingSettings] = await Promise.all([
          listAssignmentsByStudent(student.id),
          getHousingSettings(),
        ]);

        const activeAssignments = rows.filter((item) => item.status !== "cancelled");
        const sessions = {};
        await Promise.all(
          activeAssignments.map(async (assignment) => {
            sessions[assignment.classId] = await getClassSession(assignment.classId);
          }),
        );

        if (!active) return;
        setAssignments(activeAssignments);
        setClassDetails(sessions);
        setSettings(housingSettings);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load housing assignment.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [user]);

  return (
    <>
      <PageHeader title="My Housing Assignment" subtitle="On-campus room details and instructions" />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading housing assignment…</p>
        ) : assignments.length === 0 ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">
            No room assignment on file. Housing assignments appear here when you are enrolled in an
            on-campus housing class.
          </p>
        ) : (
          assignments.map((assignment) => {
            const classSession = classDetails[assignment.classId];
            return (
              <section
                key={assignment.id}
                className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-afta-muted)]">
                  {assignment.courseName}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[var(--color-afta-text)]">
                  Room {assignment.roomNumber}
                  {assignment.bedAssignment ? ` · Bed ${assignment.bedAssignment}` : ""}
                </h2>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                  <div>
                    <dt className="text-[var(--color-afta-muted)]">Building</dt>
                    <dd className="text-[var(--color-afta-text)]">{assignment.building || "Main campus"}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-afta-muted)]">Status</dt>
                    <dd className="text-[var(--color-afta-text)]">
                      {ASSIGNMENT_STATUS_LABELS[assignment.status] ?? assignment.status}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-afta-muted)]">Check-in date</dt>
                    <dd className="text-[var(--color-afta-text)]">{assignment.checkInDate || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-afta-muted)]">Check-out date</dt>
                    <dd className="text-[var(--color-afta-text)]">{assignment.checkOutDate || "—"}</dd>
                  </div>
                </dl>
                {classSession?.housingNotes ? (
                  <p className="mt-4 rounded-[10px] border border-[var(--color-afta-border)] bg-white px-4 py-3 text-sm text-[var(--color-afta-text)]">
                    <span className="font-semibold text-[var(--color-afta-text)]">Class housing notes: </span>
                    {classSession.housingNotes}
                  </p>
                ) : null}
              </section>
            );
          })
        )}

        {settings ? (
          <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
            <h2 className="text-sm font-semibold">Housing instructions</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--color-afta-text)]">{settings.studentInstructions}</p>
            <p className="mt-3 text-xs text-[var(--color-afta-muted)]">
              Standard check-in {settings.checkInTime} · check-out {settings.checkOutTime}
            </p>
            {settings.academyNotes ? (
              <p className="mt-3 text-sm text-[var(--color-afta-subtle)]">{settings.academyNotes}</p>
            ) : null}
          </section>
        ) : null}
      </div>
    </>
  );
}
