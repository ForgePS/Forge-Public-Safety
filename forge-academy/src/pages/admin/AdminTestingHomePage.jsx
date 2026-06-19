import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";

const SECTIONS = [
  {
    title: "Grading & release",
    description: "Start here after exams are submitted.",
    modules: [
      { title: "Grading & results hub", description: "Manual grading, overrides, remediation, retests, and certificate release.", to: "/admin/testing/results-hub" },
      { title: "Live proctor monitor", description: "Watch concurrent sessions, pause, force submit, or void attempts.", to: "/admin/testing/monitor" },
      { title: "Testing reports", description: "Filtered CSV exports for students, classes, eligibility, and more.", to: "/admin/testing/reports" },
    ],
  },
  {
    title: "Exam content",
    description: "Build tests and question banks.",
    modules: [
      { title: "Tests", description: "Create tests, link blueprints, and publish when complete.", to: "/admin/tests" },
      { title: "Question banks", description: "Course-linked banks with pools and imported questions.", to: "/admin/testing/question-banks" },
      { title: "Test blueprints", description: "Build exams by pool counts and difficulty mix.", to: "/admin/testing/blueprints" },
      { title: "Test categories", description: "Written, practical, retest, and certification exam types.", to: "/admin/testing/categories" },
    ],
  },
  {
    title: "Delivery setup",
    description: "Configure who takes exams and when.",
    modules: [
      { title: "Test assignments", description: "Publish locked versions and assign exams to students or classes.", to: "/admin/testing/assignments" },
      { title: "Eligibility review", description: "Verify attendance, skills, LMS, and instructor approval.", to: "/admin/testing/eligibility" },
      { title: "Testing windows", description: "Schedule open/close times for exam delivery.", to: "/admin/testing/windows" },
      { title: "Testing rooms", description: "Manage computer lab rooms and capacity.", to: "/admin/testing/rooms" },
      { title: "Seat assignments", description: "Assign students to room seats for a testing window.", to: "/admin/testing/seats" },
      { title: "Proctor assignments", description: "Assign lead and assistant proctors to tests.", to: "/admin/testing/proctors" },
      { title: "Accommodations", description: "Record extended time and other approved accommodations.", to: "/admin/testing/accommodations" },
    ],
  },
  {
    title: "Special programs",
    description: "State exams, challenge testing, and integrations.",
    modules: [
      { title: "State certification", description: "Record state written and practical exam outcomes.", to: "/admin/testing/state-certification" },
      { title: "Challenge testing", description: "Reciprocity, prior experience, and direct certification requests.", to: "/admin/testing/challenge" },
      { title: "LMS integration", description: "Connector settings, completion import, and grade passback queue.", to: "/admin/testing/lms-integration" },
      { title: "Testing audit log", description: "Security and grading audit history.", to: "/admin/testing/audit" },
    ],
  },
];

export default function AdminTestingHomePage() {
  return (
    <>
      <PageHeader
        title="Testing Hub"
        subtitle="Delivery, proctoring, grading, and certificate release"
        actions={
          <Link to="/admin/testing/results-hub" className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white">
            Grading & results
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-8 p-6 lg:p-7">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">{section.title}</h2>
              <p className="mt-1 text-xs text-[var(--color-afta-muted)]">{section.description}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {section.modules.map((module) => (
                <Link
                  key={module.to}
                  to={module.to}
                  className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5 transition hover:border-[#c8102e]/40"
                >
                  <h3 className="text-sm font-semibold text-[var(--color-afta-text)]">{module.title}</h3>
                  <p className="mt-2 text-sm text-[var(--color-afta-subtle)]">{module.description}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
