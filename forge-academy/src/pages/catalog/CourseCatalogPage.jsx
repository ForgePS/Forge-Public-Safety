import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import PageHeader from "../../components/PageHeader.jsx";
import {
  COURSE_CATEGORY_LABELS,
  filterCourses,
  getPrerequisiteLabels,
  listActiveCourses,
  listCourses,
} from "../../lib/courses.js";

/**
 * @param {{ title?: string, subtitle?: string, activeOnly?: boolean }} props
 */
export default function CourseCatalogPage({
  title = "Course Catalog",
  subtitle = "Browse academy courses and prerequisites",
  activeOnly = true,
}) {
  const [courses, setCourses] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [visibleCourses, labelCourses] = await Promise.all([
          activeOnly ? listActiveCourses() : listCourses(),
          listCourses(),
        ]);
        if (active) {
          setCourses(visibleCourses);
          setAllCourses(labelCourses);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load course catalog.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [activeOnly]);

  const allCoursesForLabels = allCourses;

  const filtered = useMemo(() => {
    let rows = filterCourses(courses, search);
    if (categoryFilter !== "all") {
      rows = rows.filter((course) => course.category === categoryFilter);
    }
    return rows;
  }, [courses, search, categoryFilter]);

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-afta-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search courses…"
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
        </div>

        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading courses…</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((course) => {
              const prerequisites = getPrerequisiteLabels(course, allCoursesForLabels);
              return (
                <article
                  key={course.id}
                  className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5"
                >
                  <p className="font-mono text-[11px] font-bold tracking-[0.08em] text-[#c8102e]">
                    {course.courseNumber}
                  </p>
                  <h2 className="mt-2 text-base font-semibold text-[var(--color-afta-text)]">{course.name}</h2>
                  <p className="mt-1 text-xs text-[var(--color-afta-muted)]">
                    {COURSE_CATEGORY_LABELS[course.category] ?? course.category} · {course.hours} hours
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--color-afta-subtle)]">
                    {course.description || "No description provided."}
                  </p>

                  <div className="mt-4 space-y-2 text-xs text-[var(--color-afta-subtle)]">
                    <p>
                      <span className="font-semibold text-[var(--color-afta-text)]">Prerequisites:</span>{" "}
                      {prerequisites.length ? prerequisites.join("; ") : "None"}
                    </p>
                    {course.requiredDocuments.length ? (
                      <p>
                        <span className="font-semibold text-[var(--color-afta-text)]">Documents:</span>{" "}
                        {course.requiredDocuments.join(", ")}
                      </p>
                    ) : null}
                    {course.requiredEquipment ? (
                      <p>
                        <span className="font-semibold text-[var(--color-afta-text)]">PPE / equipment:</span>{" "}
                        {course.requiredEquipment}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {course.skillsRequired ? (
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[var(--color-afta-subtle)]">
                        Skills
                      </span>
                    ) : null}
                    {course.testRequired ? (
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[var(--color-afta-subtle)]">
                        Test
                      </span>
                    ) : null}
                    {course.certificateIssued ? (
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[var(--color-afta-subtle)]">
                        Certificate
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && filtered.length === 0 ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">No courses match your search.</p>
        ) : null}
      </div>
    </>
  );
}
