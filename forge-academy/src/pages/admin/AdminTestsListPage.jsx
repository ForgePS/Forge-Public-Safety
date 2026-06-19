import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import PageHeader from "../../components/PageHeader.jsx";
import { listTests } from "../../lib/tests.js";

export default function AdminTestsListPage() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    listTests()
      .then(setTests)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load tests."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Tests"
        subtitle="Written examinations by course"
        actions={
          <div className="flex gap-2">
            <Link to="/admin/testing" className="app-btn-secondary px-4 py-2 text-xs">
              Testing admin
            </Link>
            <Link to="/admin/tests/new" className="inline-flex items-center gap-2 rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white">
              <Plus className="h-4 w-4" />
              New test
            </Link>
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                  <th className="px-4 py-3">Test</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Passing</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">Loading…</td></tr>
                ) : tests.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">No tests defined yet.</td></tr>
                ) : (
                  tests.map((test) => (
                    <tr key={test.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                      <td className="px-4 py-3 text-[var(--color-afta-text)]">{test.name}</td>
                      <td className="px-4 py-3">{test.courseNumber} · {test.courseName}</td>
                      <td className="px-4 py-3">{test.passingScore}/{test.maxScore}</td>
                      <td className="px-4 py-3"><Link to={`/admin/tests/${test.id}`} className="text-xs text-[#c8102e]">Edit</Link></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
