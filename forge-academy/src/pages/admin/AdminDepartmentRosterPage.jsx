import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DepartmentRosterTable from "../../components/DepartmentRosterTable.jsx";
import PageHeader, { StatCard } from "../../components/PageHeader.jsx";
import { getDepartment } from "../../lib/departments.js";
import { getDepartmentRosterSummary, listStudentsByDepartment } from "../../lib/students.js";

export default function AdminDepartmentRosterPage() {
  const { departmentId } = useParams();
  const [department, setDepartment] = useState(null);
  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [dept, roster, stats] = await Promise.all([
          getDepartment(departmentId),
          listStudentsByDepartment(departmentId),
          getDepartmentRosterSummary(departmentId),
        ]);

        if (!dept) throw new Error("Department not found.");
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
  }, [departmentId]);

  if (loading) {
    return <div className="grid flex-1 place-items-center text-[var(--color-afta-subtle)]">Loading roster…</div>;
  }

  if (error || !department) {
    return (
      <div className="p-7">
        <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
          {error ?? "Department not found."}
        </p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={`${department.name} Roster`}
        subtitle={`FDID ${department.fdid} · ${department.county} County`}
        backTo="/admin/departments"
        backLabel="Back to departments"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/admin/students/new?departmentId=${department.id}`}
              className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
            >
              Add member
            </Link>
            <Link
              to={`/admin/departments/${department.id}`}
              className="app-btn-secondary px-4 py-2 text-xs"
            >
              Edit department
            </Link>
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {summary ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active roster" value={summary.active} sub={`${summary.total} total members`} />
            <StatCard label="Career" value={summary.career} />
            <StatCard label="Volunteer" value={summary.volunteer} />
            <StatCard label="Part-time" value={summary.partTime} />
          </div>
        ) : null}

        <DepartmentRosterTable
          students={students}
          search={search}
          onSearchChange={(event) => setSearch(event.target.value)}
          editBasePath="/admin/students"
        />
      </div>
    </>
  );
}
