import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField, FormSection, FormSelect } from "../../components/StudentFormFields.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { listClassSessions } from "../../lib/classes.js";
import { listStudents } from "../../lib/students.js";
import { createTestEligibility, listTestEligibility, updateTestEligibility } from "../../lib/testEligibility.js";
import { listTests } from "../../lib/tests.js";

const emptyForm = {
  studentId: "",
  classId: "",
  testId: "",
  attendanceMet: false,
  skillsMet: false,
  lmsMet: false,
  tuitionPaid: false,
  instructorApproved: false,
  approvedToTest: false,
  denialReason: "",
};

export default function AdminTestEligibilityPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [tests, setTests] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function reload() {
    setRows(await listTestEligibility());
  }

  useEffect(() => {
    Promise.all([reload(), listStudents().then(setStudents), listClassSessions().then(setClasses), listTests().then(setTests)])
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load eligibility records."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    const student = students.find((item) => item.id === form.studentId);
    const test = tests.find((item) => item.id === form.testId);
    try {
      await createTestEligibility(
        {
          ...form,
          studentName: student ? `${student.firstName} ${student.lastName}`.trim() : "",
          testName: test?.name ?? "",
        },
        user.uid,
      );
      setForm(emptyForm);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create eligibility record.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleApproval(row) {
    if (!user) return;
    await updateTestEligibility(row.id, { approvedToTest: !row.approvedToTest }, user.uid);
    await reload();
  }

  return (
    <>
      <PageHeader title="Testing Eligibility" subtitle="Verify attendance, skills, LMS, and instructor approval" actions={<Link to="/admin/testing" className="app-btn-secondary px-4 py-2 text-xs">Testing home</Link>} />
      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        <form onSubmit={handleSubmit} className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
          <FormSection title="New eligibility review">
            <div className="grid gap-4 md:grid-cols-2">
              <FormSelect label="Student" name="studentId" value={form.studentId} onChange={(e) => setForm((p) => ({ ...p, studentId: e.target.value }))} required>
                <option value="">Select student…</option>
                {students.map((student) => <option key={student.id} value={student.id}>{student.lastName}, {student.firstName}</option>)}
              </FormSelect>
              <FormSelect label="Class" name="classId" value={form.classId} onChange={(e) => setForm((p) => ({ ...p, classId: e.target.value }))}>
                <option value="">Optional class…</option>
                {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.courseNumber} · {formatClassLabel(cls)}</option>)}
              </FormSelect>
              <FormSelect label="Test" name="testId" value={form.testId} onChange={(e) => setForm((p) => ({ ...p, testId: e.target.value }))} required>
                <option value="">Select test…</option>
                {tests.map((test) => <option key={test.id} value={test.id}>{test.name}</option>)}
              </FormSelect>
              <FormField label="Denial reason" name="denialReason" value={form.denialReason} onChange={(e) => setForm((p) => ({ ...p, denialReason: e.target.value }))} />
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-[var(--color-afta-text)]">
              {["attendanceMet", "skillsMet", "lmsMet", "tuitionPaid", "instructorApproved", "approvedToTest"].map((key) => (
                <label key={key} className="flex items-center gap-2">
                  <input type="checkbox" checked={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.checked }))} className="accent-[#c8102e]" />
                  {key.replace(/([A-Z])/g, " $1")}
                </label>
              ))}
            </div>
          </FormSection>
          <button type="submit" disabled={saving} className="mt-4 rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">Save eligibility</button>
        </form>
        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead><tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]"><th className="px-4 py-3">Student</th><th className="px-4 py-3">Test</th><th className="px-4 py-3">Checks</th><th className="px-4 py-3">Approved</th><th className="px-4 py-3">Actions</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">No eligibility records yet.</td></tr> : rows.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                    <td className="px-4 py-3 text-[var(--color-afta-text)]">{row.studentName}</td>
                    <td className="px-4 py-3">{row.testName}</td>
                    <td className="px-4 py-3 text-xs">{[
                      row.attendanceMet && "Attendance",
                      row.skillsMet && "Skills",
                      row.lmsMet && "LMS",
                      row.instructorApproved && "Instructor",
                    ].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-4 py-3">{row.approvedToTest ? "Yes" : "No"}</td>
                    <td className="px-4 py-3"><button type="button" onClick={() => toggleApproval(row)} className="text-xs text-[#c8102e]">{row.approvedToTest ? "Revoke" : "Approve"}</button></td>
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

function formatClassLabel(cls) {
  if (cls.startDate === cls.endDate) return cls.startDate;
  return `${cls.startDate} – ${cls.endDate}`;
}
