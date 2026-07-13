import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import PageHeader from "../../components/PageHeader.jsx";
import { usePortalRoles } from "../../context/PortalRolesContext.jsx";
import { filterAcademyStaff, listAcademyStaff } from "../../lib/academyStaff.js";
import { listActiveDepartments } from "../../lib/departments.js";
import { INSTRUCTOR_STATUS_LABELS } from "../../lib/instructors.js";
import { ROLE_LABELS } from "../../lib/roles.js";
import { isSystemRoleId } from "../../lib/portalRoleDefinitions.js";

export default function InstructorsListPage() {
  const { customById } = usePortalRoles();
  const [staff, setStaff] = useState([]);
  const [departmentsById, setDepartmentsById] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [staffRows, departments] = await Promise.all([
          listAcademyStaff(customById),
          listActiveDepartments(),
        ]);
        if (!active) return;
        setStaff(staffRows);
        setDepartmentsById(Object.fromEntries(departments.map((department) => [department.id, department])));
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load staff.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [customById]);

  const filtered = useMemo(() => filterAcademyStaff(staff, search, departmentsById), [staff, search, departmentsById]);

  function roleLabel(role) {
    if (ROLE_LABELS[role]) return ROLE_LABELS[role];
    if (!isSystemRoleId(role)) {
      return customById[role]?.label ?? role;
    }
    return role;
  }

  function departmentSummary(departmentIds) {
    if (!departmentIds.length) return "—";
    return departmentIds
      .map((id) => departmentsById[id]?.name ?? "Unknown department")
      .join(", ");
  }

  return (
    <>
      <PageHeader
        title="Staff"
        subtitle="Academy personnel, department affiliations, profiles, and teaching assignments"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/users/new"
              className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--color-afta-border)] px-4 py-2 text-xs font-bold text-[var(--color-afta-text)]"
            >
              <Plus className="h-4 w-4" />
              Add portal user
            </Link>
            <Link
              to="/admin/instructors/new"
              className="inline-flex items-center gap-2 rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
            >
              <Plus className="h-4 w-4" />
              Add staff profile
            </Link>
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-afta-muted)]" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search staff…"
            className="w-full rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--color-afta-text)] outline-none focus:border-[var(--color-afta-red)]/50"
          />
        </label>

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
                  <th className="px-4 py-3 font-semibold">Staff member</th>
                  <th className="px-4 py-3 font-semibold">Role / title</th>
                  <th className="px-4 py-3 font-semibold">Departments</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">Teaching profile</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      Loading staff…
                    </td>
                  </tr>
                ) : null}

                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      No staff found.
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? filtered.map((member) => (
                      <tr key={member.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                        <td className="px-4 py-3">
                          <p className="font-medium text-[var(--color-afta-text)]">{member.displayName}</p>
                          <p className="text-xs text-[var(--color-afta-muted)]">
                            {member.source === "instructor_only" ? "Profile only" : "Portal account"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p>{roleLabel(member.role)}</p>
                          <p className="text-xs text-[var(--color-afta-muted)]">{member.jobTitle || "—"}</p>
                        </td>
                        <td className="px-4 py-3 text-xs">{departmentSummary(member.departmentIds)}</td>
                        <td className="px-4 py-3">
                          <p>{member.email || "—"}</p>
                          <p className="text-xs text-[var(--color-afta-muted)]">{member.phone || "—"}</p>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {member.instructorId
                            ? INSTRUCTOR_STATUS_LABELS[member.instructorStatus] ?? member.instructorStatus
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            {member.instructorId ? (
                              <Link
                                to={`/admin/instructors/${member.instructorId}`}
                                className="text-xs font-semibold text-[#c8102e] hover:text-[var(--color-afta-text)]"
                              >
                                Manage profile
                              </Link>
                            ) : null}
                            {member.userId ? (
                              <Link
                                to={`/admin/users/${member.userId}`}
                                className="text-xs font-semibold text-[#c8102e] hover:text-[var(--color-afta-text)]"
                              >
                                Portal user
                              </Link>
                            ) : null}
                          </div>
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
