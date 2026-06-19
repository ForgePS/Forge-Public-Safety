import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { db } from "../../lib/firebase.js";
import { recordLmsGradePassback } from "../../lib/lmsIntegration.js";
import { listCertificateReleaseQueue, reviewCertificateRelease } from "../../lib/testGrading.js";

export default function AdminCertificateReleasePage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function reload() {
    const pending = await listCertificateReleaseQueue("pending_admin_review");
    const held = await listCertificateReleaseQueue("held");
    setRows([...pending, ...held]);
  }

  async function handleReview(row, decision) {
    setError(null);
    try {
      await reviewCertificateRelease(row.id, decision);
      if (decision === "approved_for_release" && user?.uid && row.testResultId) {
        const resultSnap = await getDoc(doc(db, "testResults", row.testResultId));
        const result = resultSnap.exists() ? resultSnap.data() : null;
        await recordLmsGradePassback(
          {
            testResultId: row.testResultId,
            studentId: row.studentId,
            score: result?.score ?? 0,
            passFail: result?.passFail ?? "pass",
          },
          user.uid,
        );
      }
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update certificate release.");
    }
  }

  useEffect(() => {
    reload().catch((err) => setError(err instanceof Error ? err.message : "Unable to load release queue.")).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader title="Certificate Release Queue" subtitle="Certificates remain pending until admin approval" actions={<Link to="/admin/testing/results-hub" className="app-btn-secondary px-4 py-2 text-xs">Results hub</Link>} />
      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead><tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]"><th className="px-4 py-3">Student</th><th className="px-4 py-3">Class</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">No certificates awaiting release.</td></tr> : rows.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                    <td className="px-4 py-3 text-[var(--color-afta-text)]">{row.studentId}</td>
                    <td className="px-4 py-3">{row.classId}</td>
                    <td className="px-4 py-3">{row.status}</td>
                    <td className="px-4 py-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => handleReview(row, "approved_for_release")} className="text-xs text-green-400">Release</button>
                      <button type="button" onClick={() => handleReview(row, "held")} className="text-xs text-amber-300">Hold</button>
                      <button type="button" onClick={() => handleReview(row, "denied")} className="text-xs text-[#c8102e]">Deny</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
