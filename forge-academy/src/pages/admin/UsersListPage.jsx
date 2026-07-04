import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { listActiveDepartments } from "../../lib/departments.js";
import {
  ALL_ROLES,
  ROLE_LABELS,
  ROLES,
  canAssignPortalRole,
  canManagePortalUserWithRole,
} from "../../lib/roles.js";
import { canManagePortalUsers, savePortalUserRole } from "../../lib/portalUserAdmin.js";
import { listStudents } from "../../lib/students.js";
import { listAllPortalUsers } from "../../lib/users.js";

export default function UsersListPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [savingRoleFor, setSavingRoleFor] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [portalUsers, departmentRows, studentRows] = await Promise.all([
          listAllPortalUsers(),
          listActiveDepartments(),
          listStudents(),
        ]);
        if (!active) return;
        setUsers(portalUsers);
        setDepartments(departmentRows);
        setStudents(studentRows);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load portal users.");
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

  const departmentNames = useMemo(
    () => Object.fromEntries(departments.map((department) => [department.id, department.name])),
    [departments],
  );

  const studentNames = useMemo(
    () => Object.fromEntries(students.map((student) => [student.id, `${student.firstName} ${student.lastName}`.trim()])),
    [students],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((portalUser) => {
      if (roleFilter !== "all" && portalUser.role !== roleFilter) return false;
      if (!term) return true;
      return [
        portalUser.displayName,
        portalUser.email,
        portalUser.jobTitle,
        ROLE_LABELS[portalUser.role],
        departmentNames[portalUser.departmentId],
        studentNames[portalUser.studentId],
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [users, search, roleFilter, departmentNames, studentNames]);

  const assignableRoles = useMemo(
    () => ALL_ROLES.filter((role) => canAssignPortalRole(currentUser?.role, role)),
    [currentUser?.role],
  );

  const canEditRoles = canManagePortalUsers(currentUser?.role) && assignableRoles.length > 0;

  async function handleRoleChange(portalUser, newRole) {
    if (portalUser.role === newRole) return;
    if (!canManagePortalUserWithRole(currentUser?.role, portalUser.role)) {
      setError("You do not have permission to manage this user.");
      return;
    }
    if (!canAssignPortalRole(currentUser?.role, newRole)) {
      setError("You do not have permission to assign that role.");
      return;
    }

    setSavingRoleFor(portalUser.uid);
    setError(null);
    setSuccess(null);
    try {
      await savePortalUserRole(currentUser?.role, portalUser, newRole);
      setUsers((current) =>
        current.map((row) => (row.uid === portalUser.uid ? { ...row, role: newRole } : row)),
      );
      setSuccess(`Updated ${portalUser.displayName} to ${ROLE_LABELS[newRole]}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update role.");
    } finally {
      setSavingRoleFor("");
    }
  }

  return (
    <>
      <PageHeader
        title="Portal Users"
        subtitle="Create login accounts for students, instructors, departments, and staff"
        actions={
          <Link
            to="/admin/users/new"
            className="inline-flex items-center gap-2 rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            Add Portal User
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        <div className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm px-4 py-3 text-sm text-[var(--color-afta-subtle)]">
          Portal users receive Firebase Auth credentials plus a role profile. Student accounts must
          link to a student record. Department accounts must link to a department. Instructor
          accounts can optionally link to an instructor profile.
          {canEditRoles ? (
            <span className="mt-2 block font-medium text-[var(--color-afta-text)]">
              Change roles directly in the table below, or use Edit for full account details.
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-afta-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, role, department…"
              className="w-full rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--color-afta-text)] outline-none focus:border-[var(--color-afta-red)]/50"
            />
          </label>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] px-3 py-2.5 text-sm text-[var(--color-afta-text)] outline-none"
          >
            <option value="all">All roles</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
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
        {success ? (
          <p className="rounded-[10px] border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-800">
            {success}
          </p>
        ) : null}

        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase tracking-[0.06em] text-[var(--color-afta-muted)]">
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Linked record</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      Loading portal users…
                    </td>
                  </tr>
                ) : null}

                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      No portal users found.
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? filtered.map((portalUser) => {
                      let linked = "—";
                      if (portalUser.role === ROLES.DEPARTMENT && portalUser.departmentId) {
                        linked = departmentNames[portalUser.departmentId] || portalUser.departmentId;
                      }
                      if (portalUser.role === ROLES.STUDENT && portalUser.studentId) {
                        linked = studentNames[portalUser.studentId] || portalUser.studentId;
                      }

                      return (
                        <tr key={portalUser.uid} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {portalUser.photoUrl ? (
                                <img
                                  src={portalUser.photoUrl}
                                  alt=""
                                  className="h-9 w-9 shrink-0 rounded-full border border-[var(--color-afta-border)] object-cover"
                                />
                              ) : (
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-afta-border)] bg-[var(--color-afta-bg)] text-xs font-bold text-[var(--color-afta-muted)]">
                                  {portalUser.displayName?.charAt(0) ?? "?"}
                                </span>
                              )}
                              <div>
                                <p className="font-medium text-[var(--color-afta-text)]">{portalUser.displayName}</p>
                                <p className="text-xs text-[var(--color-afta-muted)]">{portalUser.email}</p>
                                {portalUser.jobTitle ? (
                                  <p className="text-xs text-[var(--color-afta-subtle)]">{portalUser.jobTitle}</p>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {canEditRoles && canManagePortalUserWithRole(currentUser?.role, portalUser.role) ? (
                              <select
                                value={portalUser.role}
                                disabled={savingRoleFor === portalUser.uid}
                                onChange={(event) => handleRoleChange(portalUser, event.target.value)}
                                className="min-w-[10rem] rounded-[8px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] px-2 py-1.5 text-sm text-[var(--color-afta-text)] outline-none focus:border-[#c8102e]/50 disabled:opacity-60"
                              >
                                {assignableRoles.map((role) => (
                                  <option key={role} value={role}>
                                    {ROLE_LABELS[role]}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              ROLE_LABELS[portalUser.role] ?? portalUser.role
                            )}
                          </td>
                          <td className="px-4 py-3">{linked}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                portalUser.disabled
                                  ? "bg-slate-500/20 text-slate-400"
                                  : "bg-green-500/15 text-green-400"
                              }`}
                            >
                              {portalUser.disabled ? "disabled" : "active"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              to={`/admin/users/${portalUser.uid}`}
                              className="text-xs font-semibold text-[#c8102e] hover:text-[var(--color-afta-text)]"
                            >
                              Edit
                            </Link>
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
