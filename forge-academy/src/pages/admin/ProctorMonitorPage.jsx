import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { FormSelect } from "../../components/StudentFormFields.jsx";
import { listClassSessions } from "../../lib/classes.js";
import { listActiveTestSessions, proctorTestAction } from "../../lib/onlineTesting.js";
import { listTests } from "../../lib/tests.js";

function formatStatus(session) {
  if (session.status === "submitted") return "Submitted";
  if (session.status === "paused") return "Paused";
  if (session.status === "active") return "In progress";
  if (session.status === "voided") return "Voided";
  return session.status || "Unknown";
}

/**
 * @param {{ backTo: string, title?: string, subtitle?: string }} props
 */
export default function ProctorMonitorPage({
  backTo,
  title = "Live Proctor Monitor",
  subtitle = "Monitor concurrent student sessions and apply proctor controls",
}) {
  const [sessions, setSessions] = useState([]);
  const [tests, setTests] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filters, setFilters] = useState({ testId: "", classId: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acting, setActing] = useState("");

  async function reload() {
    const rows = await listActiveTestSessions(filters);
    setSessions(Array.isArray(rows) ? rows : []);
  }

  useEffect(() => {
    Promise.all([listTests().then(setTests), listClassSessions().then(setClasses)]).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const rows = await listActiveTestSessions(filters);
        if (active) setSessions(Array.isArray(rows) ? rows : []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load sessions.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    const interval = window.setInterval(load, 10000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [filters]);

  async function runAction(sessionId, action) {
    setActing(`${sessionId}:${action}`);
    setError(null);
    try {
      const reason =
        action === "note" || action === "void"
          ? window.prompt("Enter a reason or note:") || ""
          : "";
      await proctorTestAction(sessionId, action, reason);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Proctor action failed.");
    } finally {
      setActing("");
    }
  }

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <Link to={backTo} className="app-btn-secondary px-4 py-2 text-xs">
            Back
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <FormSelect label="Filter by test" name="testId" value={filters.testId} onChange={(e) => setFilters((p) => ({ ...p, testId: e.target.value }))}>
            <option value="">All tests</option>
            {tests.map((test) => <option key={test.id} value={test.id}>{test.name}</option>)}
          </FormSelect>
          <FormSelect label="Filter by class" name="classId" value={filters.classId} onChange={(e) => setFilters((p) => ({ ...p, classId: e.target.value }))}>
            <option value="">All classes</option>
            {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.courseNumber} · {cls.startDate}</option>)}
          </FormSelect>
        </div>

        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Test</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Time left</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">Loading live sessions…</td></tr>
                ) : sessions.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">No active sessions.</td></tr>
                ) : (
                  sessions.map((session) => (
                    <tr key={session.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                      <td className="px-4 py-3 text-[var(--color-afta-text)]">{session.studentName || session.studentId}</td>
                      <td className="px-4 py-3">{session.departmentName || "—"}</td>
                      <td className="px-4 py-3">{session.testName}</td>
                      <td className="px-4 py-3">{formatStatus(session)}</td>
                      <td className="px-4 py-3">{session.timeRemainingSeconds ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {[
                            ["pause", "Pause"],
                            ["resume", "Resume"],
                            ["force_submit", "Force submit"],
                            ["void", "Void"],
                            ["restart_allowed", "Allow restart"],
                            ["note", "Note"],
                          ].map(([action, label]) => (
                            <button
                              key={action}
                              type="button"
                              disabled={acting === `${session.id}:${action}`}
                              onClick={() => runAction(session.id, action)}
                              className="text-[10px] font-semibold text-[#c8102e]"
                            >
                              {label}
                            </button>
                          ))}
                        </div>
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
