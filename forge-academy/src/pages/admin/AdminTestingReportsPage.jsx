import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { listActiveDepartments } from "../../lib/departments.js";
import { listClassSessions } from "../../lib/classes.js";
import {
  EMPTY_TESTING_FILTERS,
  exportTestingReport,
} from "../../lib/testingReports.js";

const REPORTS = [
  {
    key: "student",
    title: "Student testing report",
    description: "Per-student exam outcomes with department and class context.",
    filtered: true,
  },
  {
    key: "class",
    title: "Class testing report",
    description: "Pass/fail totals and average scores grouped by class session.",
    filtered: true,
  },
  {
    key: "instructor",
    title: "Instructor testing report",
    description: "Aggregated results for classes taught by each instructor.",
    filtered: true,
  },
  {
    key: "passFail",
    title: "Exam pass/fail export",
    description: "Flat list of filtered test results (legacy pass/fail format).",
    filtered: true,
  },
  {
    key: "questionAnalytics",
    title: "Question analytics report",
    description: "Item analysis metrics and review flags for all questions.",
    filtered: false,
  },
  {
    key: "eligibility",
    title: "Certification eligibility report",
    description: "Eligibility checklist status by student and test.",
    filtered: true,
  },
  {
    key: "state",
    title: "State testing report",
    description: "State written/practical certification exam records.",
    filtered: true,
  },
  {
    key: "remediation",
    title: "Remediation report",
    description: "Active and completed remediation assignments.",
    filtered: false,
  },
  {
    key: "retest",
    title: "Retest requests report",
    description: "Pending student retest authorization requests.",
    filtered: false,
  },
  {
    key: "certificateRelease",
    title: "Certificate release report",
    description: "Certificates awaiting admin release or on hold.",
    filtered: false,
  },
];

export default function AdminTestingReportsPage() {
  const [filters, setFilters] = useState(EMPTY_TESTING_FILTERS);
  const [classes, setClasses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadingKey, setLoadingKey] = useState("");
  const [error, setError] = useState(null);
  const [lastExport, setLastExport] = useState("");

  useEffect(() => {
    Promise.all([listClassSessions(), listActiveDepartments()])
      .then(([classRows, departmentRows]) => {
        setClasses(classRows);
        setDepartments(departmentRows);
      })
      .catch(() => {
        // Filters still work without reference data.
      });
  }, []);

  const courseOptions = useMemo(() => {
    const map = new Map();
    for (const session of classes) {
      if (!session.courseId) continue;
      map.set(session.courseId, {
        id: session.courseId,
        label: `${session.courseNumber} — ${session.courseName}`,
      });
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [classes]);

  async function handleExport(reportKey, title) {
    setLoadingKey(reportKey);
    setError(null);
    try {
      const count = await exportTestingReport(reportKey, filters);
      setLastExport(`${title}: ${count} row${count === 1 ? "" : "s"} exported.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to export report.");
    } finally {
      setLoadingKey("");
    }
  }

  return (
    <>
      <PageHeader
        title="Testing Reports"
        subtitle="Parameterized exports for the enterprise testing reporting suite"
        actions={
          <Link to="/admin/testing/results-hub" className="app-btn-secondary px-4 py-2 text-xs">
            Results hub
          </Link>
        }
      />
      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="app-error">{error}</p> : null}
        {lastExport ? (
          <p className="rounded-[10px] border border-green-500/30 bg-green-50 px-4 py-3 text-sm text-green-800">
            {lastExport}
          </p>
        ) : null}

        <section className="app-panel p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-afta-text)]">Report filters</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="block">
              <span className="app-label">Start date</span>
              <input
                type="date"
                value={filters.startDate}
                onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))}
                className="app-input"
              />
            </label>
            <label className="block">
              <span className="app-label">End date</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))}
                className="app-input"
              />
            </label>
            <label className="block">
              <span className="app-label">Class session</span>
              <select
                value={filters.classId}
                onChange={(event) => setFilters((current) => ({ ...current, classId: event.target.value }))}
                className="app-input"
              >
                <option value="">All classes</option>
                {classes.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.courseNumber} · {session.startDate} · {session.location}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="app-label">Course</span>
              <select
                value={filters.courseId}
                onChange={(event) => setFilters((current) => ({ ...current, courseId: event.target.value }))}
                className="app-input"
              >
                <option value="">All courses</option>
                {courseOptions.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="app-label">Department</span>
              <select
                value={filters.departmentId}
                onChange={(event) => setFilters((current) => ({ ...current, departmentId: event.target.value }))}
                className="app-input"
              >
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            onClick={() => setFilters(EMPTY_TESTING_FILTERS)}
            className="mt-4 app-btn-secondary px-4 py-2 text-xs"
          >
            Clear filters
          </button>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {REPORTS.map((report) => (
            <button
              key={report.key}
              type="button"
              disabled={Boolean(loadingKey)}
              onClick={() => handleExport(report.key, report.title)}
              className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] p-5 text-left shadow-sm transition hover:border-[#c8102e]/40 disabled:opacity-60"
            >
              <span className="text-sm font-semibold text-[var(--color-afta-text)]">{report.title}</span>
              <p className="mt-2 text-xs text-[var(--color-afta-subtle)]">{report.description}</p>
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">
                {report.filtered ? "Uses filters above" : "Full export"}
                {loadingKey === report.key ? " · Exporting…" : ""}
              </p>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
