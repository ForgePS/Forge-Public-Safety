import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { FormSection, FormSelect } from "../../components/StudentFormFields.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { listInstructors } from "../../lib/instructors.js";
import { createProctorAssignment, deleteProctorAssignment, listProctorAssignments, PROCTOR_ROLES } from "../../lib/proctorAssignments.js";
import { listTestingWindows } from "../../lib/testingWindows.js";
import { listTests } from "../../lib/tests.js";

export default function AdminProctorAssignmentsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [tests, setTests] = useState([]);
  const [windows, setWindows] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [form, setForm] = useState({ testId: "", testingWindowId: "", instructorId: "", role: PROCTOR_ROLES.LEAD });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function reload() {
    setRows(await listProctorAssignments());
  }

  useEffect(() => {
    Promise.all([reload(), listTests().then(setTests), listTestingWindows().then(setWindows), listInstructors().then(setInstructors)])
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load proctor assignments."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    const test = tests.find((item) => item.id === form.testId);
    const instructor = instructors.find((item) => item.id === form.instructorId);
    try {
      await createProctorAssignment({
        ...form,
        testName: test?.name ?? "",
        instructorName: instructor ? `${instructor.firstName} ${instructor.lastName}`.trim() : "",
      }, user.uid);
      setForm({ testId: form.testId, testingWindowId: "", instructorId: "", role: PROCTOR_ROLES.ASSISTANT });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to assign proctor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Proctor Assignments" subtitle="Assign lead and assistant proctors to tests" actions={<Link to="/admin/testing" className="app-btn-secondary px-4 py-2 text-xs">Testing home</Link>} />
      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        <form onSubmit={handleSubmit} className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
          <FormSection title="Assign proctor">
            <div className="grid gap-4 md:grid-cols-2">
              <FormSelect label="Test" name="testId" value={form.testId} onChange={(e) => setForm((p) => ({ ...p, testId: e.target.value }))} required>
                <option value="">Select test…</option>
                {tests.map((test) => <option key={test.id} value={test.id}>{test.name}</option>)}
              </FormSelect>
              <FormSelect label="Testing window" name="testingWindowId" value={form.testingWindowId} onChange={(e) => setForm((p) => ({ ...p, testingWindowId: e.target.value }))}>
                <option value="">Optional window…</option>
                {windows.map((window) => <option key={window.id} value={window.id}>{window.testName} · {window.openDateTime}</option>)}
              </FormSelect>
              <FormSelect label="Instructor" name="instructorId" value={form.instructorId} onChange={(e) => setForm((p) => ({ ...p, instructorId: e.target.value }))} required>
                <option value="">Select instructor…</option>
                {instructors.map((instructor) => <option key={instructor.id} value={instructor.id}>{instructor.lastName}, {instructor.firstName}</option>)}
              </FormSelect>
              <FormSelect label="Role" name="role" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
                <option value={PROCTOR_ROLES.LEAD}>Lead</option>
                <option value={PROCTOR_ROLES.ASSISTANT}>Assistant</option>
              </FormSelect>
            </div>
          </FormSection>
          <button type="submit" disabled={saving} className="mt-4 rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">Assign proctor</button>
        </form>
        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead><tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]"><th className="px-4 py-3">Test</th><th className="px-4 py-3">Instructor</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Actions</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">No proctor assignments yet.</td></tr> : rows.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                    <td className="px-4 py-3 text-[var(--color-afta-text)]">{row.testName}</td>
                    <td className="px-4 py-3">{row.instructorName}</td>
                    <td className="px-4 py-3 capitalize">{row.role}</td>
                    <td className="px-4 py-3"><button type="button" onClick={() => user && deleteProctorAssignment(row.id, user.uid).then(reload)} className="text-xs text-[#c8102e]">Remove</button></td>
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
