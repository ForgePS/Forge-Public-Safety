import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import PageHeader from "../../components/PageHeader.jsx";
import { listAssignmentsByInstructorId } from "../../lib/instructorAssignments.js";
import {
  INSTRUCTOR_STATUS_LABELS,
  filterInstructors,
  instructorDisplayName,
  listInstructors,
} from "../../lib/instructors.js";

export default function InstructorsListPage() {
  const [instructors, setInstructors] = useState([]);
  const [assignmentCounts, setAssignmentCounts] = useState({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await listInstructors();
        if (!active) return;
        setInstructors(data);

        const counts = {};
        await Promise.all(
          data.map(async (instructor) => {
            const assignments = await listAssignmentsByInstructorId(instructor.id);
            counts[instructor.id] = assignments.filter((item) => item.status === "scheduled").length;
          }),
        );
        if (active) setAssignmentCounts(counts);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load instructors.");
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
    let rows = filterInstructors(instructors, search);
    if (statusFilter !== "all") {
      rows = rows.filter((instructor) => instructor.status === statusFilter);
    }
    return rows;
  }, [instructors, search, statusFilter]);

  return (
    <>
      <PageHeader
        title="Instructors"
        subtitle="Profiles, credentials, availability, and class assignments"
        actions={
          <Link
            to="/admin/instructors/new"
            className="inline-flex items-center gap-2 rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            Add Instructor
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
              placeholder="Search instructors…"
              className="w-full rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--color-afta-text)] outline-none focus:border-[var(--color-afta-red)]/50"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] px-3 py-2.5 text-sm text-[var(--color-afta-text)] outline-none"
          >
            <option value="all">All statuses</option>
            {Object.entries(INSTRUCTOR_STATUS_LABELS).map(([value, label]) => (
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

        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase tracking-[0.06em] text-[var(--color-afta-muted)]">
                  <th className="px-4 py-3 font-semibold">Instructor</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">Specialties</th>
                  <th className="px-4 py-3 font-semibold">Assignments</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      Loading instructors…
                    </td>
                  </tr>
                ) : null}

                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      No instructors found.
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? filtered.map((instructor) => (
                      <tr key={instructor.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                        <td className="px-4 py-3">
                          <p className="font-medium text-[var(--color-afta-text)]">{instructorDisplayName(instructor)}</p>
                          <p className="text-xs text-[var(--color-afta-muted)]">{instructor.employeeId || "No employee ID"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p>{instructor.email}</p>
                          <p className="text-xs text-[var(--color-afta-muted)]">{instructor.phone || "—"}</p>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {instructor.specialties.length ? instructor.specialties.join(", ") : "—"}
                        </td>
                        <td className="px-4 py-3">{assignmentCounts[instructor.id] ?? 0} scheduled</td>
                        <td className="px-4 py-3">
                          {INSTRUCTOR_STATUS_LABELS[instructor.status] ?? instructor.status}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/admin/instructors/${instructor.id}`}
                            className="text-xs font-semibold text-[#c8102e] hover:text-[var(--color-afta-text)]"
                          >
                            Manage
                          </Link>
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
