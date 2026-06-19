import { Link } from "react-router-dom";
import {
  EMPLOYMENT_STATUS_LABELS,
  STUDENT_STATUSES,
  filterStudents,
} from "../lib/students.js";

/**
 * @param {{
 *   students: import('../lib/students.js').StudentRecord[],
 *   search: string,
 *   onSearchChange: import('react').ChangeEventHandler<HTMLInputElement>,
 *   editBasePath?: string,
 *   emptyMessage?: string,
 * }} props
 */
export default function DepartmentRosterTable({
  students,
  search,
  onSearchChange,
  editBasePath = "/admin/students",
  emptyMessage = "No roster members found.",
}) {
  const filtered = filterStudents(students, search);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        value={search}
        onChange={onSearchChange}
        placeholder="Search roster by name, FEMA SID, rank, email…"
        className="w-full rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] px-3 py-2.5 text-sm text-[var(--color-afta-text)] outline-none focus:border-[var(--color-afta-red)]/50"
      />

      <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase tracking-[0.06em] text-[var(--color-afta-muted)]">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">FEMA SID</th>
                <th className="px-4 py-3 font-semibold">Rank</th>
                <th className="px-4 py-3 font-semibold">Employment</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                {editBasePath ? <th className="px-4 py-3 font-semibold">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={editBasePath ? 6 : 5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                    {emptyMessage}
                  </td>
                </tr>
              ) : null}

              {filtered.map((student) => (
                <tr key={student.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--color-afta-text)]">
                      {student.lastName}, {student.firstName}
                    </p>
                    <p className="text-xs text-[var(--color-afta-muted)]">{student.email || "No email"}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{student.femaSid}</td>
                  <td className="px-4 py-3">{student.rank || "—"}</td>
                  <td className="px-4 py-3">
                    {EMPLOYMENT_STATUS_LABELS[student.employmentStatus] ?? student.employmentStatus}
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
                  {editBasePath ? (
                    <td className="px-4 py-3">
                      <Link
                        to={`${editBasePath}/${student.id}`}
                        className="text-xs font-semibold text-[#c8102e] hover:text-[var(--color-afta-text)]"
                      >
                        Edit
                      </Link>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-[var(--color-afta-muted)]">
        Showing {filtered.length} of {students.length} roster members
      </p>
    </div>
  );
}
