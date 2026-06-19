import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import PageHeader from "../../components/PageHeader.jsx";
import {
  DEPARTMENT_STATUSES,
  filterDepartments,
  listDepartments,
} from "../../lib/departments.js";
import { listStudents, summarizeRosterCountsByDepartment } from "../../lib/students.js";

export default function DepartmentsListPage() {
  const [departments, setDepartments] = useState([]);
  const [rosterCounts, setRosterCounts] = useState({});
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
        const data = await listDepartments();
        if (!active) return;
        setDepartments(data);

        const students = await listStudents();
        if (active) {
          setRosterCounts(summarizeRosterCountsByDepartment(students));
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load departments.");
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
    let rows = filterDepartments(departments, search);
    if (statusFilter !== "all") {
      rows = rows.filter((department) => department.status === statusFilter);
    }
    return rows;
  }, [departments, search, statusFilter]);

  return (
    <>
      <PageHeader
        title="Departments"
        subtitle="Fire department profiles, FDID, and roster links"
        actions={
          <Link
            to="/admin/departments/new"
            className="inline-flex items-center gap-2 rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            Add Department
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
              placeholder="Search name, FDID, county, type…"
              className="w-full rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--color-afta-text)] outline-none focus:border-[var(--color-afta-red)]/50"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] px-3 py-2.5 text-sm text-[var(--color-afta-text)] outline-none"
          >
            <option value="all">All statuses</option>
            <option value={DEPARTMENT_STATUSES.ACTIVE}>Active</option>
            <option value={DEPARTMENT_STATUSES.INACTIVE}>Inactive</option>
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
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">FDID</th>
                  <th className="px-4 py-3 font-semibold">County</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Roster</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      Loading departments…
                    </td>
                  </tr>
                ) : null}

                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      No departments found.
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? filtered.map((department) => {
                      const summary = rosterCounts[department.id];
                      return (
                        <tr key={department.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                          <td className="px-4 py-3">
                            <p className="font-medium text-[var(--color-afta-text)]">{department.name}</p>
                            <p className="text-xs text-[var(--color-afta-muted)]">
                              {department.city ? `${department.city}, ${department.state}` : "—"}
                            </p>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{department.fdid}</td>
                          <td className="px-4 py-3">{department.county}</td>
                          <td className="px-4 py-3">{department.departmentType || "—"}</td>
                          <td className="px-4 py-3">
                            {summary ? `${summary.active} active / ${summary.total} total` : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                department.status === DEPARTMENT_STATUSES.ACTIVE
                                  ? "bg-green-500/15 text-green-400"
                                  : "bg-slate-500/20 text-slate-400"
                              }`}
                            >
                              {department.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <Link
                                to={`/admin/departments/${department.id}`}
                                className="text-xs font-semibold text-[#c8102e] hover:text-[var(--color-afta-text)]"
                              >
                                Edit
                              </Link>
                              <Link
                                to={`/admin/departments/${department.id}/roster`}
                                className="text-xs font-semibold text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)]"
                              >
                                Roster
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
