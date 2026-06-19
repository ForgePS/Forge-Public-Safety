import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { formatClassDates, getClassSession } from "../../lib/classes.js";
import {
  CERTIFICATE_STATUSES,
  issueCertificate,
  listCertificatesByClass,
} from "../../lib/certificates.js";
import {
  COMPLETION_STATUS_LABELS,
  COMPLETION_STATUSES,
  evaluateClassCompletions,
  listCompletionsByClass,
} from "../../lib/completions.js";
import {
  getIncompleteAttendanceDates,
  listAttendanceDaysForClass,
  summarizeAttendanceDay,
} from "../../lib/attendance.js";
import { listEnrolledRegistrationsByClass } from "../../lib/registrations.js";

export default function AdminClassRosterPage() {
  const { classId } = useParams();
  const { user } = useAuth();
  const [classSession, setClassSession] = useState(null);
  const [roster, setRoster] = useState([]);
  const [attendanceDays, setAttendanceDays] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [actingKey, setActingKey] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  async function reloadData() {
    const [session, enrolled, days, completionRows, certificateRows] = await Promise.all([
      getClassSession(classId),
      listEnrolledRegistrationsByClass(classId),
      listAttendanceDaysForClass(classId),
      listCompletionsByClass(classId),
      listCertificatesByClass(classId),
    ]);
    setClassSession(session);
    setRoster(enrolled);
    setAttendanceDays(days);
    setCompletions(completionRows);
    setCertificates(certificateRows);
  }

  useEffect(() => {
    if (!classId) return;

    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        await reloadData();
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load class roster.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [classId]);

  const incompleteDates =
    classSession ? getIncompleteAttendanceDates(classSession, attendanceDays) : [];

  const certificateByStudent = useMemo(() => {
    const map = new Map();
    certificates.forEach((cert) => map.set(cert.studentId, cert));
    return map;
  }, [certificates]);

  async function handleEvaluateCompletions() {
    if (!classId) return;
    setEvaluating(true);
    setError(null);
    setMessage(null);
    try {
      const rows = await evaluateClassCompletions(classId);
      setCompletions(rows);
      setMessage("Completion evaluation finished.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to evaluate completions.");
    } finally {
      setEvaluating(false);
    }
  }

  async function handleIssueCertificate(studentId) {
    if (!classId || !user?.uid) return;
    const key = `issue_${studentId}`;
    setActingKey(key);
    setError(null);
    setMessage(null);
    try {
      await issueCertificate({ classId, studentId, issuedByUid: user.uid });
      await reloadData();
      setMessage("Certificate issued.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to issue certificate.");
    } finally {
      setActingKey("");
    }
  }

  function handlePrintCertificate(certificateId) {
    window.open(`/admin/certificates/${certificateId}/print`, "_blank", "noopener,noreferrer");
  }

  function handlePrintAllIssued() {
    const issued = certificates.filter((cert) => cert.status === CERTIFICATE_STATUSES.ISSUED);
    issued.forEach((cert) => handlePrintCertificate(cert.id));
  }

  return (
    <>
      <PageHeader
        title="Class Roster"
        subtitle={
          classSession
            ? `${classSession.courseNumber} · ${formatClassDates(classSession)}`
            : "Enrolled students, attendance, and certificates"
        }
        backTo="/admin/scheduling"
        backLabel="Back to classes"
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={evaluating}
              onClick={handleEvaluateCompletions}
              className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              {evaluating ? "Evaluating…" : "Evaluate completions"}
            </button>
            <button
              type="button"
              onClick={handlePrintAllIssued}
              className="app-btn-secondary px-4 py-2 text-xs"
            >
              Print all issued
            </button>
            <Link
              to={`/admin/scheduling/${classId}/tests`}
              className="app-btn-secondary px-4 py-2 text-xs"
            >
              Tests
            </Link>
            <Link
              to={`/admin/scheduling/${classId}/skills`}
              className="app-btn-secondary px-4 py-2 text-xs"
            >
              Skills
            </Link>
            <Link
              to={`/admin/scheduling/${classId}`}
              className="app-btn-secondary px-4 py-2 text-xs"
            >
              Edit session
            </Link>
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
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

        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading roster…</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-4">
                <p className="text-[10px] font-semibold uppercase text-[var(--color-afta-muted)]">Enrolled</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-afta-text)]">{roster.length}</p>
              </div>
              <div className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-4">
                <p className="text-[10px] font-semibold uppercase text-[var(--color-afta-muted)]">Finalized days</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-afta-text)]">
                  {attendanceDays.filter((day) => day.finalized).length}
                </p>
              </div>
              <div className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-4">
                <p className="text-[10px] font-semibold uppercase text-[var(--color-afta-muted)]">Incomplete days</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-afta-text)]">{incompleteDates.length}</p>
              </div>
            </div>

            <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
              <div className="border-b border-[var(--color-afta-border)] px-5 py-4">
                <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Enrolled roster</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase tracking-[0.06em] text-[var(--color-afta-muted)]">
                      <th className="px-4 py-3 font-semibold">Student</th>
                      <th className="px-4 py-3 font-semibold">Department</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                          No enrolled students yet.
                        </td>
                      </tr>
                    ) : (
                      roster.map((registration) => (
                        <tr key={registration.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                          <td className="px-4 py-3 font-medium text-[var(--color-afta-text)]">{registration.studentName}</td>
                          <td className="px-4 py-3">{registration.departmentName || "—"}</td>
                          <td className="px-4 py-3">{registration.studentEmail || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
              <div className="border-b border-[var(--color-afta-border)] px-5 py-4">
                <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Attendance by day</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase tracking-[0.06em] text-[var(--color-afta-muted)]">
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Present</th>
                      <th className="px-4 py-3 font-semibold">Absent</th>
                      <th className="px-4 py-3 font-semibold">Tardy</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceDays.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                          No attendance recorded yet.
                        </td>
                      </tr>
                    ) : (
                      attendanceDays.map((day) => {
                        const summary = summarizeAttendanceDay(day);
                        return (
                          <tr key={day.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                            <td className="px-4 py-3">{day.sessionDate}</td>
                            <td className="px-4 py-3">{summary.present}</td>
                            <td className="px-4 py-3">{summary.absent}</td>
                            <td className="px-4 py-3">{summary.tardy}</td>
                            <td className="px-4 py-3">
                              {day.finalized ? "Finalized" : "Draft"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {incompleteDates.length ? (
              <p className="text-sm text-[var(--color-afta-subtle)]">
                Missing finalized attendance for: {incompleteDates.join(", ")}
              </p>
            ) : null}

            <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
              <div className="border-b border-[var(--color-afta-border)] px-5 py-4">
                <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Certificates & completion</h2>
                <p className="mt-1 text-xs text-[var(--color-afta-subtle)]">
                  Issue and print certificates directly from the class roster. Serial numbers are assigned automatically.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase tracking-[0.06em] text-[var(--color-afta-muted)]">
                      <th className="px-4 py-3 font-semibold">Student</th>
                      <th className="px-4 py-3 font-semibold">Completion</th>
                      <th className="px-4 py-3 font-semibold">Serial #</th>
                      <th className="px-4 py-3 font-semibold">Certificate</th>
                      <th className="px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                          Run completion evaluation after attendance is finalized.
                        </td>
                      </tr>
                    ) : (
                      completions.map((row) => {
                        const cert = certificateByStudent.get(row.studentId);
                        const issueKey = `issue_${row.studentId}`;
                        return (
                          <tr key={row.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                            <td className="px-4 py-3 font-medium">{row.studentName}</td>
                            <td className="px-4 py-3">
                              {COMPLETION_STATUS_LABELS[row.status] ?? row.status}
                              {row.notes ? (
                                <span className="mt-1 block text-xs text-[var(--color-afta-subtle)]">{row.notes}</span>
                              ) : null}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">{cert?.certificateNumber || "—"}</td>
                            <td className="px-4 py-3">
                              {cert?.status === CERTIFICATE_STATUSES.ISSUED
                                ? "Issued"
                                : cert?.status === CERTIFICATE_STATUSES.PENDING_RELEASE
                                  ? "Pending release"
                                  : cert?.status === CERTIFICATE_STATUSES.REVOKED
                                    ? "Revoked"
                                    : "—"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                {row.status === COMPLETION_STATUSES.ELIGIBLE && !cert ? (
                                  <button
                                    type="button"
                                    disabled={actingKey === issueKey}
                                    onClick={() => handleIssueCertificate(row.studentId)}
                                    className="text-xs font-semibold text-[#c8102e]"
                                  >
                                    {actingKey === issueKey ? "Issuing…" : "Issue certificate"}
                                  </button>
                                ) : null}
                                {cert?.status === CERTIFICATE_STATUSES.ISSUED ? (
                                  <button
                                    type="button"
                                    onClick={() => handlePrintCertificate(cert.id)}
                                    className="text-xs font-semibold text-[#c8102e]"
                                  >
                                    Print
                                  </button>
                                ) : null}
                                {cert?.status === CERTIFICATE_STATUSES.PENDING_RELEASE ? (
                                  <Link to="/admin/testing/certificate-release" className="text-xs text-[#c8102e]">
                                    Release queue
                                  </Link>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
