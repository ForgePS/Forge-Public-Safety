import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import PageHeader from "../../components/PageHeader.jsx";
import {
  COURSE_CATEGORY_LABELS,
  COURSE_STATUSES,
  filterCourses,
  getPrerequisiteLabels,
  listCourses,
} from "../../lib/courses.js";

export default function CoursesListPage() {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await listCourses();
        if (active) setCourses(data);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load courses.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    let rows = filterCourses(courses, search);
    if (categoryFilter !== "all") {
      rows = rows.filter((course) => course.category === categoryFilter);
    }
    if (statusFilter !== "all") {
      rows = rows.filter((course) => course.status === statusFilter);
    }
    return rows;
  }, [courses, search, categoryFilter, statusFilter]);

  return (
    <>
      <PageHeader
        title="Course Catalog"
        subtitle="Academy course definitions and prerequisites"
        actions={
          <Link
            to="/admin/courses/new"
            className="inline-flex items-center gap-2 rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            Add Course
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-afta-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search course name, number, certification type…"
              className="w-full rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--color-afta-text)] outline-none focus:border-[var(--color-afta-red)]/50"
            />
          </label>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] px-3 py-2.5 text-sm text-[var(--color-afta-text)] outline-none"
          >
            <option value="all">All categories</option>
            {Object.entries(COURSE_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] px-3 py-2.5 text-sm text-[var(--color-afta-text)] outline-none"
          >
            <option value="all">All statuses</option>
            <option value={COURSE_STATUSES.ACTIVE}>Active</option>
            <option value={COURSE_STATUSES.INACTIVE}>Inactive</option>
          </select>
        </div>

        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase tracking-[0.06em] text-[var(--color-afta-muted)]">
                  <th className="px-4 py-3 font-semibold">Course</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Hours</th>
                  <th className="px-4 py-3 font-semibold">Prerequisites</th>
                  <th className="px-4 py-3 font-semibold">Requirements</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      Loading courses…
                    </td>
                  </tr>
                ) : null}

                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      No courses found.
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? filtered.map((course) => {
                      const prerequisites = getPrerequisiteLabels(course, courses);
                      return (
                        <tr key={course.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                          <td className="px-4 py-3">
                            <p className="font-medium text-[var(--color-afta-text)]">{course.name}</p>
                            <p className="font-mono text-xs text-[#c8102e]">{course.courseNumber}</p>
                          </td>
                          <td className="px-4 py-3">
                            {COURSE_CATEGORY_LABELS[course.category] ?? course.category}
                          </td>
                          <td className="px-4 py-3">{course.hours}</td>
                          <td className="px-4 py-3 text-xs">
                            {prerequisites.length ? prerequisites.join("; ") : "None"}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {[
                              course.skillsRequired ? "Skills" : null,
                              course.testRequired ? "Test" : null,
                              course.certificateIssued ? "Cert" : null,
                            ]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                course.status === COURSE_STATUSES.ACTIVE
                                  ? "bg-green-500/15 text-green-400"
                                  : "bg-slate-500/20 text-slate-400"
                              }`}
                            >
                              {course.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-3">
                              <Link
                                to={`/admin/scheduling/new?courseId=${course.id}`}
                                className="text-xs font-semibold text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)]"
                              >
                                Schedule
                              </Link>
                              <Link
                                to={`/admin/courses/${course.id}`}
                                className="text-xs font-semibold text-[#c8102e] hover:text-[var(--color-afta-text)]"
                              >
                                Edit
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
