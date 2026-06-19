import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import PageHeader from "../../components/PageHeader.jsx";
import {
  EMPLOYMENT_STATUS_LABELS,
  STUDENT_STATUSES,
  filterStudents,
  listStudents,
} from "../../lib/students.js";

export default function StudentsListPage() {
  const [students, setStudents] = useState([]);
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
        const data = await listStudents();
        if (active) setStudents(data);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load students.");
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
    let rows = filterStudents(students, search);
    if (statusFilter !== "all") {
      rows = rows.filter((student) => student.status === statusFilter);
    }
    return rows;
  }, [students, search, statusFilter]);

  return (
    <>
      <PageHeader
        title="Students"
        subtitle="Permanent training records · FEMA SID required"
        actions={
          <Link
            to="/admin/students/new"
            className="inline-flex items-center gap-2 rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            Add Student
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-afta-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, FEMA SID, email, department, phone…"
              className="w-full rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--color-afta-text)] outline-none focus:border-[var(--color-afta-red)]/50"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] px-3 py-2.5 text-sm text-[var(--color-afta-text)] outline-none"
          >
            <option value="all">All statuses</option>
            <option value={STUDENT_STATUSES.ACTIVE}>Active</option>
            <option value={STUDENT_STATUSES.INACTIVE}>Inactive</option>
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
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">FEMA SID</th>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Rank</th>
                  <th className="px-4 py-3 font-semibold">Employment</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      Loading students…
                    </td>
                  </tr>
                ) : null}

                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      No students found.
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? filtered.map((student) => (
                      <tr key={student.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                        <td className="px-4 py-3">
                          <p className="font-medium text-[var(--color-afta-text)]">
                            {student.lastName}, {student.firstName}
                          </p>
                          <p className="text-xs text-[var(--color-afta-muted)]">{student.email || "No email"}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{student.femaSid}</td>
                        <td className="px-4 py-3">{student.departmentName || "—"}</td>
                        <td className="px-4 py-3">{student.rank || "—"}</td>
                        <td className="px-4 py-3">
                          {EMPLOYMENT_STATUS_LABELS[student.employmentStatus] ??
                            student.employmentStatus}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              student.status === STUDENT_STATUSES.ACTIVE
                                ? "bg-green-500/15 text-green-400"
                                : "bg-slate-500/20 text-slate-400"
                            }`}
                          >
                            {student.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-3">
                            <Link
                              to={`/admin/students/${student.id}/transcript`}
                              className="text-xs font-semibold text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)]"
                            >
                              Transcript
                            </Link>
                            <Link
                              to={`/admin/students/${student.id}`}
                              className="text-xs font-semibold text-[#c8102e] hover:text-[var(--color-afta-text)]"
                            >
                              Edit
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-xs text-[var(--color-afta-muted)]">
          Showing {filtered.length} of {students.length} student records
        </p>
      </div>
    </>
  );
}
