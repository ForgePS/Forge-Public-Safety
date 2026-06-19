import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";

const modules = [
  { title: "Manual grading queue", description: "Review short-answer and scenario responses.", to: "/admin/testing/grading" },
  { title: "Test results & overrides", description: "Review scores and override with audit reason.", to: "/admin/testing/results" },
  { title: "Question analytics", description: "Failure rates, distractor stats, and review alerts.", to: "/admin/testing/analytics" },
  { title: "Exam review queue", description: "Questions flagged for content review.", to: "/admin/testing/exam-review" },
  { title: "Remediation", description: "Track failed exam remediation assignments.", to: "/admin/testing/remediation" },
  { title: "Retest requests", description: "Approve or deny student retest requests.", to: "/admin/testing/retests" },
  { title: "Certificate release", description: "Approve, hold, or deny certificate release.", to: "/admin/testing/certificate-release" },
  { title: "State certification", description: "Record state written/practical exam outcomes.", to: "/admin/testing/state-certification" },
  { title: "Challenge testing", description: "Reciprocity and prior experience challenge requests.", to: "/admin/testing/challenge" },
  { title: "Testing audit log", description: "Immutable history of grading and release actions.", to: "/admin/testing/audit" },
  { title: "Testing reports", description: "Export pass/fail, remediation, and release reports.", to: "/admin/testing/reports" },
];

export default function AdminTestingResultsHubPage() {
  return (
    <>
      <PageHeader title="Grading & Results" subtitle="Sprint 10C — grading, analytics, remediation, and certificate release" actions={<Link to="/admin/testing" className="app-btn-secondary px-4 py-2 text-xs">Testing home</Link>} />
      <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3 lg:p-7">
        {modules.map((module) => (
          <Link key={module.to} to={module.to} className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5 transition hover:border-[#c8102e]/40">
            <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">{module.title}</h2>
            <p className="mt-2 text-sm text-[var(--color-afta-subtle)]">{module.description}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
