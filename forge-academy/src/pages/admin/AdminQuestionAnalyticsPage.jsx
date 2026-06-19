import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { listExamReviewQueue, listQuestionAnalytics } from "../../lib/testGrading.js";

export default function AdminQuestionAnalyticsPage() {
  const [analytics, setAnalytics] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([listQuestionAnalytics(), listExamReviewQueue()])
      .then(([analyticsRows, reviewRows]) => {
        setAnalytics(analyticsRows);
        setReviews(reviewRows);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load analytics."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader title="Question Analytics" subtitle="Performance metrics and exam review alerts" actions={<Link to="/admin/testing/results-hub" className="app-btn-secondary px-4 py-2 text-xs">Results hub</Link>} />
      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="border-b border-[var(--color-afta-border)] px-5 py-4"><h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Question performance</h2></div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead><tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]"><th className="px-4 py-3">Question</th><th className="px-4 py-3">Used</th><th className="px-4 py-3">Correct</th><th className="px-4 py-3">Incorrect</th><th className="px-4 py-3">% Correct</th><th className="px-4 py-3">Flagged</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">Loading…</td></tr> : analytics.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">No analytics yet.</td></tr> : analytics.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                    <td className="px-4 py-3 font-mono text-xs">{row.questionId}</td>
                    <td className="px-4 py-3">{row.timesUsed}</td>
                    <td className="px-4 py-3">{row.correctCount}</td>
                    <td className="px-4 py-3">{row.incorrectCount}</td>
                    <td className="px-4 py-3">{row.percentCorrect}%</td>
                    <td className="px-4 py-3">{row.flaggedForReview ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="border-b border-[var(--color-afta-border)] px-5 py-4"><h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Exam review queue</h2></div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead><tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]"><th className="px-4 py-3">Question</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Status</th></tr></thead>
              <tbody>
                {reviews.length === 0 ? <tr><td colSpan={3} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">No review items.</td></tr> : reviews.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                    <td className="px-4 py-3 font-mono text-xs">{row.questionId}</td>
                    <td className="px-4 py-3">{row.reason}</td>
                    <td className="px-4 py-3">{row.status}</td>
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
