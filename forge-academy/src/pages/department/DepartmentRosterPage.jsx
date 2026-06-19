import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DepartmentRosterTable from "../../components/DepartmentRosterTable.jsx";
import PageHeader, { StatCard } from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { getDepartment } from "../../lib/departments.js";
import { getDepartmentRosterSummary, listStudentsByDepartment } from "../../lib/students.js";

export default function DepartmentRosterPage() {
  const { user } = useAuth();
  const [department, setDepartment] = useState(null);
  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.departmentId) {
      setLoading(false);
      setError("Your account is not linked to a department. Contact an academy administrator.");
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [dept, roster, stats] = await Promise.all([
          getDepartment(user.departmentId),
          listStudentsByDepartment(user.departmentId),
          getDepartmentRosterSummary(user.departmentId),
        ]);

        if (!dept) throw new Error("Department profile not found.");
        if (!active) return;

        setDepartment(dept);
        setStudents(roster);
        setSummary(stats);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load roster.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [user?.departmentId]);

  if (loading) {
    return <div className="grid flex-1 place-items-center text-[var(--color-afta-subtle)]">Loading roster…</div>;
  }

  return (
    <>
      <PageHeader
        title="Department Roster"
        subtitle={department ? `${department.name} · FDID ${department.fdid}` : "Roster management"}
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {summary ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active roster" value={summary.active} sub={`${summary.total} total members`} />
            <StatCard label="Career" value={summary.career} />
            <StatCard label="Volunteer" value={summary.volunteer} />
            <StatCard label="Inactive" value={summary.inactive} warn={summary.inactive > 0} />
          </div>
        ) : null}

        {!error && department ? (
          <>
            <DepartmentRosterTable
              students={students}
              search={search}
              onSearchChange={(event) => setSearch(event.target.value)}
              editBasePath={null}
              emptyMessage="No members are assigned to this department yet."
            />
            <p className="text-xs text-[var(--color-afta-muted)]">
              Member edits are managed by academy staff. Contact the Arkansas Fire Training Academy to update roster records.
            </p>
          </>
        ) : null}

        {!error && !department ? (
          <Link to="/department" className="text-sm font-semibold text-[#c8102e]">
            Back to dashboard
          </Link>
        ) : null}
      </div>
    </>
  );
}
