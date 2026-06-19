import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  ATTENDANCE_STATUS_LABELS,
  finalizeAttendanceDay,
  getClassSessionDates,
  loadAttendanceSheet,
  saveAttendanceDay,
  summarizeAttendanceDay,
  todayDateString,
} from "../../lib/attendance.js";
import { formatClassDates, getClassSession } from "../../lib/classes.js";

export default function InstructorAttendanceSheetPage() {
  const { classId } = useParams();
  const { user } = useAuth();
  const [classSession, setClassSession] = useState(null);
  const [sessionDate, setSessionDate] = useState("");
  const [records, setRecords] = useState([]);
  const [finalized, setFinalized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!classId) return;

    let active = true;

    async function loadClass() {
      try {
        const session = await getClassSession(classId);
        if (!active || !session) return;
        setClassSession(session);

        const dates = getClassSessionDates(session);
        const today = todayDateString();
        const defaultDate = dates.includes(today) ? today : dates[0] ?? "";
        setSessionDate(defaultDate);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load class session.");
        }
      }
    }

    loadClass();
    return () => {
      active = false;
    };
  }, [classId]);

  useEffect(() => {
    if (!classId || !sessionDate) return;

    let active = true;

    async function loadSheet() {
      setLoading(true);
      setError(null);
      setMessage(null);
      try {
        const sheet = await loadAttendanceSheet(classId, sessionDate);
        if (!active) return;
        setRecords(sheet.records);
        setFinalized(sheet.finalized);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load attendance sheet.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSheet();
    return () => {
      active = false;
    };
  }, [classId, sessionDate]);

  const summary = useMemo(() => summarizeAttendanceDay({ records }), [records]);
  const dateOptions = useMemo(
    () => (classSession ? getClassSessionDates(classSession) : []),
    [classSession],
  );

  function updateRecord(studentId, field, value) {
    setRecords((current) =>
      current.map((record) =>
        record.studentId === studentId ? { ...record, [field]: value } : record,
      ),
    );
  }

  async function handleSave() {
    if (!classId || !sessionDate || !user?.uid) return;

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await saveAttendanceDay(classId, sessionDate, records, user.uid);
      setMessage("Attendance saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save attendance.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFinalize() {
    if (!classId || !sessionDate || !user?.uid) return;
    if (!window.confirm("Finalize attendance for this day? Instructors will not be able to edit it.")) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await saveAttendanceDay(classId, sessionDate, records, user.uid);
      await finalizeAttendanceDay(classId, sessionDate, records, user.uid);
      setFinalized(true);
      setMessage("Attendance finalized.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to finalize attendance.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title={classSession?.courseName ?? "Attendance Sheet"}
        subtitle={
          classSession
            ? `${classSession.courseNumber} · ${formatClassDates(classSession)}`
            : "Class roster attendance"
        }
        actions={
          <Link
            to="/instructor/attendance"
            className="app-btn-secondary px-4 py-2 text-xs"
          >
            Back to attendance
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="block flex-1">
            <span className="mb-1.5 block text-[11px] font-semibold text-[var(--color-afta-muted)]">Session date</span>
            <select
              value={sessionDate}
              onChange={(event) => setSessionDate(event.target.value)}
              className="w-full rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] px-3 py-2.5 text-sm text-[var(--color-afta-text)] outline-none"
            >
              {dateOptions.map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase text-[var(--color-afta-subtle)]">
            <span className="rounded-full bg-white px-2 py-1">{summary.present} present</span>
            <span className="rounded-full bg-white px-2 py-1">{summary.absent} absent</span>
            <span className="rounded-full bg-white px-2 py-1">{summary.tardy} tardy</span>
            <span className="rounded-full bg-white px-2 py-1">{summary.unmarked} unmarked</span>
          </div>
        </div>

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

        {finalized ? (
          <p className="rounded-[10px] border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">
            This attendance sheet is finalized.
          </p>
        ) : null}

        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase tracking-[0.06em] text-[var(--color-afta-muted)]">
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Attendance</th>
                  <th className="px-4 py-3 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      Loading roster…
                    </td>
                  </tr>
                ) : null}

                {!loading && records.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      No enrolled students for this class yet.
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? records.map((record) => (
                      <tr key={record.studentId} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                        <td className="px-4 py-3 font-medium text-[var(--color-afta-text)]">{record.studentName}</td>
                        <td className="px-4 py-3">{record.departmentName || "—"}</td>
                        <td className="px-4 py-3">
                          <select
                            value={record.status}
                            disabled={finalized || saving}
                            onChange={(event) =>
                              updateRecord(record.studentId, "status", event.target.value)
                            }
                            className="rounded-[8px] border border-[var(--color-afta-border)] bg-white px-2 py-1.5 text-xs text-[var(--color-afta-text)] outline-none disabled:opacity-60"
                          >
                            {Object.entries(ATTENDANCE_STATUS_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={record.notes}
                            disabled={finalized || saving}
                            onChange={(event) =>
                              updateRecord(record.studentId, "notes", event.target.value)
                            }
                            placeholder="Optional"
                            className="w-full min-w-[160px] rounded-[8px] border border-[var(--color-afta-border)] bg-white px-2 py-1.5 text-xs text-[var(--color-afta-text)] outline-none disabled:opacity-60"
                          />
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
        </section>

        {!finalized ? (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={saving || loading || records.length === 0}
              onClick={handleSave}
              className="rounded-[10px] border border-[var(--color-afta-border)] px-5 py-2.5 text-sm font-semibold text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)] disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save draft"}
            </button>
            <button
              type="button"
              disabled={saving || loading || records.length === 0}
              onClick={handleFinalize}
              className="rounded-[10px] bg-[#c8102e] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              Finalize day
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
