import { useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { listOpenClassSessions, groupClassSessionsByCourse, formatClassDates, partitionClassSessionsByCampus } from "../../lib/classes.js";
import { submitBulkRegistrations } from "../../lib/registrations.js";
import { listStudentsByDepartment } from "../../lib/students.js";

export default function DepartmentBulkRegisterPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [classId, setClassId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.departmentId) {
      setLoading(false);
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [roster, openSessions] = await Promise.all([
          listStudentsByDepartment(user.departmentId),
          listOpenClassSessions(),
        ]);
        if (!active) return;
        setStudents(roster.filter((student) => student.status === "active"));
        setSessions(openSessions);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load bulk registration data.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [user?.departmentId]);

  function toggleStudent(studentId) {
    setSelectedStudents((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!classId || selectedStudents.length === 0) return;

    setSubmitting(true);
    setError(null);
    setResults([]);

    try {
      const batchResults = await submitBulkRegistrations({
        studentIds: selectedStudents,
        classId,
        submittedByUid: user.uid,
      });
      setResults(batchResults);
      setSelectedStudents([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit bulk registrations.");
    } finally {
      setSubmitting(false);
    }
  }

  const { onCampus, offCampus } = partitionClassSessionsByCampus(sessions);
  const onCampusGroups = groupClassSessionsByCourse(onCampus);
  const offCampusGroups = groupClassSessionsByCourse(offCampus);

  return (
    <>
      <PageHeader title="Bulk Registration" subtitle="Submit roster members for class approval" />

      <form className="flex flex-1 flex-col gap-5 p-6 lg:p-7" onSubmit={handleSubmit}>
        {!user?.departmentId ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">
            Your user profile needs a linked department before bulk registration can load.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold text-[var(--color-afta-muted)]">Class session</span>
            <select
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              className="w-full rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-afta-text)] outline-none"
              required
            >
              <option value="">Select open class</option>
              {onCampusGroups.length ? (
                <optgroup label="On-campus classes">
                  {onCampusGroups.map((group) =>
                    group.sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {group.courseName} · {formatClassDates(session)} · {session.location}
                      </option>
                    )),
                  )}
                </optgroup>
              ) : null}
              {offCampusGroups.length ? (
                <optgroup label="Off-campus classes">
                  {offCampusGroups.map((group) =>
                    group.sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {group.courseName} · {formatClassDates(session)} · {session.location}
                      </option>
                    )),
                  )}
                </optgroup>
              ) : null}
            </select>
          </label>
        </section>

        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-afta-text)]">Select roster members</h2>
          {loading ? (
            <p className="text-sm text-[var(--color-afta-subtle)]">Loading roster…</p>
          ) : students.length === 0 ? (
            <p className="text-sm text-[var(--color-afta-subtle)]">No active roster members found.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {students.map((student) => (
                <label
                  key={student.id}
                  className="flex items-start gap-3 rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2.5"
                >
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.id)}
                    onChange={() => toggleStudent(student.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-[var(--color-afta-text)]">
                      {student.firstName} {student.lastName}
                    </span>
                    <span className="block text-xs text-[var(--color-afta-muted)]">{student.email || student.femaSid}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </section>

        <button
          type="submit"
          disabled={submitting || !classId || selectedStudents.length === 0}
          className="self-start rounded-[10px] bg-[#c8102e] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {submitting ? "Submitting…" : `Submit ${selectedStudents.length || ""} registration(s)`}
        </button>

        {results.length ? (
          <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
            <h2 className="mb-3 text-sm font-semibold text-[var(--color-afta-text)]">Results</h2>
            <ul className="space-y-2 text-sm">
              {results.map((result) => (
                <li key={result.studentId} className={result.success ? "text-green-300" : "text-red-700"}>
                  {result.studentId}: {result.success ? "Submitted" : result.error}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </form>
    </>
  );
}
