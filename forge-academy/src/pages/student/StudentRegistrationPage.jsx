import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import PageHeader from "../../components/PageHeader.jsx";
import StudentAvailableClassesTable from "../../components/StudentAvailableClassesTable.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  isOnCampusClass,
  listOpenClassSessions,
  partitionClassSessionsByCampus,
  sortClassSessionsByCourseAndDate,
  filterClassSessionsExcludingCompletedCourses,
} from "../../lib/classes.js";
import {
  ACTIVE_REGISTRATION_STATUSES,
  CAMPUS_MEAL_LODGING_LABELS,
  CAMPUS_MEAL_LODGING_OPTIONS,
  REGISTRATION_STATUS_LABELS,
  REGISTRATION_STATUSES,
  cancelRegistration,
  formatCampusMealLodgingPreference,
  listRegistrationsByStudent,
  submitRegistration,
} from "../../lib/registrations.js";
import { getStudentForUser } from "../../lib/students.js";
import { getCompletedCourseIdsForStudent } from "../../lib/studentProfile.js";

function statusBadgeClass(status) {
  if (status === REGISTRATION_STATUSES.ENROLLED) return "bg-green-500/15 text-green-400";
  if (status === REGISTRATION_STATUSES.DENIED || status === REGISTRATION_STATUSES.CANCELLED) {
    return "bg-red-500/15 text-red-400";
  }
  if (
    status === REGISTRATION_STATUSES.PENDING_DEPARTMENT ||
    status === REGISTRATION_STATUSES.PENDING_ACADEMY
  ) {
    return "bg-blue-500/15 text-blue-400";
  }
  return "bg-slate-500/20 text-slate-400";
}

export default function StudentRegistrationPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedClassId = searchParams.get("classId") ?? "";
  const [student, setStudent] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [campusMealLodgingPreference, setCampusMealLodgingPreference] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  async function reload(studentRecord) {
    const [openSessions, myRegistrations] = await Promise.all([
      listOpenClassSessions(),
      studentRecord ? listRegistrationsByStudent(studentRecord.id) : [],
    ]);
    const completedCourseIds = studentRecord
      ? await getCompletedCourseIdsForStudent(studentRecord.id)
      : new Set();
    setSessions(
      filterClassSessionsExcludingCompletedCourses(openSessions, completedCourseIds),
    );
    setRegistrations(myRegistrations);
  }

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const studentRecord = await getStudentForUser(user);
        if (!active) return;
        setStudent(studentRecord);
        await reload(studentRecord);
        if (preselectedClassId) {
          setSelectedClassId(preselectedClassId);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load registration data.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [user, preselectedClassId]);

  const filteredSessions = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = term
      ? sessions.filter((session) =>
          [session.courseName, session.courseNumber, session.location]
            .join(" ")
            .toLowerCase()
            .includes(term),
        )
      : sessions;
    return sortClassSessionsByCourseAndDate(rows);
  }, [sessions, search]);

  const { onCampus: onCampusSessions, offCampus: offCampusSessions } = useMemo(
    () => partitionClassSessionsByCampus(filteredSessions),
    [filteredSessions],
  );

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedClassId) ?? null,
    [sessions, selectedClassId],
  );

  const selectedOnCampus = selectedSession ? isOnCampusClass(selectedSession) : false;

  async function handleSubmitRegistration(event) {
    event.preventDefault();
    if (!student || !selectedClassId) return;

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await submitRegistration({
        studentId: student.id,
        classId: selectedClassId,
        notes,
        campusMealLodgingPreference: selectedOnCampus ? campusMealLodgingPreference : "",
        submittedByUid: user.uid,
      });
      setNotes("");
      setCampusMealLodgingPreference("");
      setSelectedClassId("");
      await reload(student);
      setMessage(
        "Registration submitted. Confirmation emails have been sent to you and your department contacts. Track approval status below.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit registration.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelRegistration(registrationId) {
    if (!student || !window.confirm("Cancel this registration request?")) return;

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await cancelRegistration(registrationId);
      await reload(student);
      setMessage("Registration cancelled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel registration.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Register for Class"
        subtitle="Browse open sessions and submit registration requests"
        actions={
          <Link
            to="/student/catalog"
            className="app-btn-secondary px-4 py-2 text-xs"
          >
            Course catalog
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-6 p-6 lg:p-7">
        {!student && !loading ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            No student record is linked to your account. Ask an administrator to link your login to a
            student profile (via matching email or `studentId` on your user record).
          </p>
        ) : null}

        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {message ? (
          <p className="rounded-[10px] border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
            {message}
          </p>
        ) : null}

        <section className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Open class sessions</h2>
            <label className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-afta-muted)]" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search open classes…"
                className="w-full rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--color-afta-text)] outline-none focus:border-[var(--color-afta-red)]/50"
              />
            </label>
          </div>

          {loading ? (
            <p className="text-sm text-[var(--color-afta-subtle)]">Loading open classes…</p>
          ) : (
            <div className="space-y-6">
              <StudentAvailableClassesTable
                sessions={onCampusSessions}
                loading={loading}
                title="On-campus classes"
                subtitle={`${onCampusSessions.length} open session${onCampusSessions.length === 1 ? "" : "s"} at AFTA Camden`}
                emptyMessage="No on-campus sessions are open right now."
                hideSearch
                groupByCourse
                selectedClassId={selectedClassId}
                onSelectSession={(classId) => {
                  setSelectedClassId(classId);
                  setCampusMealLodgingPreference("");
                }}
              />
              <StudentAvailableClassesTable
                sessions={offCampusSessions}
                loading={loading}
                title="Off-campus classes"
                subtitle={`${offCampusSessions.length} regional offering${offCampusSessions.length === 1 ? "" : "s"} statewide`}
                emptyMessage="No off-campus sessions are open right now."
                hideSearch
                groupByCourse
                selectedClassId={selectedClassId}
                onSelectSession={(classId) => {
                  setSelectedClassId(classId);
                  setCampusMealLodgingPreference("");
                }}
              />
            </div>
          )}

          {!loading && filteredSessions.length === 0 ? (
            <p className="text-sm text-[var(--color-afta-subtle)]">No open class sessions match your search.</p>
          ) : null}
        </section>

        {selectedClassId && student ? (
          <form
            onSubmit={handleSubmitRegistration}
            className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5"
          >
            <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Submit registration</h2>
            <p className="mt-2 text-sm text-[var(--color-afta-subtle)]">
              {student.departmentName
                ? "Your request will route to your department training officer, then the academy. Email confirmations go to you, your training officer, and fire chief."
                : "Your request will route directly to academy approval. A confirmation email will be sent to you."}
            </p>
            {selectedOnCampus ? (
              <fieldset className="mt-4">
                <legend className="mb-2 block text-[11px] font-semibold text-[var(--color-afta-muted)]">
                  On-campus lodging &amp; meals (required)
                </legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {Object.entries(CAMPUS_MEAL_LODGING_OPTIONS).map(([key, value]) => (
                    <label
                      key={key}
                      className={`flex cursor-pointer items-start gap-2 rounded-[10px] border px-3 py-2.5 text-sm ${
                        campusMealLodgingPreference === value
                          ? "border-[#c8102e]/60 bg-white text-[var(--color-afta-text)]"
                          : "border-[var(--color-afta-border)] bg-white text-[var(--color-afta-text)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="campusMealLodgingPreference"
                        value={value}
                        checked={campusMealLodgingPreference === value}
                        onChange={(event) => setCampusMealLodgingPreference(event.target.value)}
                        className="mt-1 accent-[#c8102e]"
                        required
                      />
                      <span>{CAMPUS_MEAL_LODGING_LABELS[value]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}
            <label className="mt-4 block">
              <span className="mb-1.5 block text-[11px] font-semibold text-[var(--color-afta-muted)]">Notes (optional)</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className="w-full rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-afta-text)] outline-none focus:border-[var(--color-afta-red)]/50"
                placeholder="Scheduling notes, dietary restrictions, accessibility needs, etc."
              />
            </label>
            <div className="mt-4 flex gap-3">
              <button
                type="submit"
                disabled={submitting || (selectedOnCampus && !campusMealLodgingPreference)}
                className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit registration"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedClassId("");
                  setCampusMealLodgingPreference("");
                }}
                className="rounded-[10px] border border-[var(--color-afta-border)] px-4 py-2 text-xs font-semibold text-[var(--color-afta-subtle)]"
              >
                Clear selection
              </button>
            </div>
          </form>
        ) : null}

        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="border-b border-[var(--color-afta-border)] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">My registrations</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase tracking-[0.06em] text-[var(--color-afta-muted)]">
                  <th className="px-4 py-3 font-semibold">Course</th>
                  <th className="px-4 py-3 font-semibold">Dates</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {registrations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      No registrations yet.
                    </td>
                  </tr>
                ) : (
                  registrations.map((registration) => (
                    <tr key={registration.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--color-afta-text)]">{registration.courseName}</p>
                        <p className="font-mono text-xs text-[#c8102e]">{registration.courseNumber}</p>
                      </td>
                      <td className="px-4 py-3">
                        {registration.classStartDate === registration.classEndDate
                          ? registration.classStartDate
                          : `${registration.classStartDate} – ${registration.classEndDate}`}
                      </td>
                      <td className="px-4 py-3">{registration.classLocation}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadgeClass(registration.status)}`}
                        >
                          {REGISTRATION_STATUS_LABELS[registration.status] ?? registration.status}
                        </span>
                        {registration.denialReason ? (
                          <p className="mt-1 text-xs text-[var(--color-afta-muted)]">{registration.denialReason}</p>
                        ) : null}
                        {formatCampusMealLodgingPreference(registration) ? (
                          <p className="mt-1 text-xs text-[var(--color-afta-muted)]">
                            {formatCampusMealLodgingPreference(registration)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        {ACTIVE_REGISTRATION_STATUSES.includes(registration.status) ? (
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => handleCancelRegistration(registration.id)}
                            className="text-xs font-semibold text-[#c8102e] hover:text-[var(--color-afta-text)] disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
