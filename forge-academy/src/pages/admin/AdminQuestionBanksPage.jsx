import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import PageHeader from "../../components/PageHeader.jsx";
import { listQuestionBanks } from "../../lib/questionBanks.js";

export default function AdminQuestionBanksPage() {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    listQuestionBanks()
      .then(setBanks)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load question banks."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Question Banks"
        subtitle="Course-linked exam libraries with pools and imported questions"
        actions={
          <div className="flex gap-2">
            <Link to="/admin/testing" className="app-btn-secondary px-4 py-2 text-xs">
              Testing home
            </Link>
            <Link to="/admin/testing/question-banks/new" className="inline-flex items-center gap-2 rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white">
              <Plus className="h-4 w-4" />
              New bank
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
                  <th className="px-4 py-3">Bank</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Questions</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">Loading…</td></tr>
                ) : banks.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">No question banks yet.</td></tr>
                ) : (
                  banks.map((bank) => (
                    <tr key={bank.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                      <td className="px-4 py-3 text-[var(--color-afta-text)]">{bank.name}</td>
                      <td className="px-4 py-3">{bank.courseName || bank.courseId || "—"}</td>
                      <td className="px-4 py-3">{bank.questionCount}</td>
                      <td className="px-4 py-3">{bank.active ? "Active" : "Inactive"}</td>
                      <td className="px-4 py-3">
                        <Link to={`/admin/testing/question-banks/${bank.id}`} className="text-xs text-[#c8102e]">
                          Manage
                        </Link>
                      </td>
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
