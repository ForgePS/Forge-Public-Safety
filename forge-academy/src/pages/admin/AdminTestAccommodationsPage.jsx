import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField, FormSection, FormSelect, FormTextarea } from "../../components/StudentFormFields.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { listClassSessions } from "../../lib/classes.js";
import { listStudents } from "../../lib/students.js";
import {
  ACCOMMODATION_TYPE_LABELS,
  ACCOMMODATION_TYPES,
  createTestAccommodation,
  listTestAccommodations,
} from "../../lib/testAccommodations.js";
import { listTests } from "../../lib/tests.js";

export default function AdminTestAccommodationsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [tests, setTests] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({
    studentId: "",
    testId: "",
    classId: "",
    accommodationType: ACCOMMODATION_TYPES.EXTENDED_TIME,
    extraTimePercent: "50",
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function reload() {
    setRows(await listTestAccommodations());
  }

  useEffect(() => {
    Promise.all([reload(), listStudents().then(setStudents), listTests().then(setTests), listClassSessions().then(setClasses)])
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load accommodations."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    const student = students.find((item) => item.id === form.studentId);
    try {
      await createTestAccommodation({
        ...form,
        studentName: student ? `${student.firstName} ${student.lastName}`.trim() : "",
        extraTimePercent: form.accommodationType === ACCOMMODATION_TYPES.EXTENDED_TIME ? Number(form.extraTimePercent) : null,
      }, user.uid);
      setForm({ studentId: "", testId: "", classId: "", accommodationType: ACCOMMODATION_TYPES.EXTENDED_TIME, extraTimePercent: "50", notes: "" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to record accommodation.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Test Accommodations" subtitle="Extended time, separate room, and other approved accommodations" actions={<Link to="/admin/testing" className="app-btn-secondary px-4 py-2 text-xs">Testing home</Link>} />
      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        <form onSubmit={handleSubmit} className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
          <FormSection title="Record accommodation">
            <div className="grid gap-4 md:grid-cols-2">
              <FormSelect label="Student" name="studentId" value={form.studentId} onChange={(e) => setForm((p) => ({ ...p, studentId: e.target.value }))} required>
                <option value="">Select student…</option>
                {students.map((student) => <option key={student.id} value={student.id}>{student.lastName}, {student.firstName}</option>)}
              </FormSelect>
              <FormSelect label="Accommodation type" name="accommodationType" value={form.accommodationType} onChange={(e) => setForm((p) => ({ ...p, accommodationType: e.target.value }))}>
                {Object.entries(ACCOMMODATION_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </FormSelect>
              <FormSelect label="Test" name="testId" value={form.testId} onChange={(e) => setForm((p) => ({ ...p, testId: e.target.value }))}>
                <option value="">Optional test…</option>
                {tests.map((test) => <option key={test.id} value={test.id}>{test.name}</option>)}
              </FormSelect>
              <FormSelect label="Class" name="classId" value={form.classId} onChange={(e) => setForm((p) => ({ ...p, classId: e.target.value }))}>
                <option value="">Optional class…</option>
                {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.courseNumber} · {cls.startDate}</option>)}
              </FormSelect>
              {form.accommodationType === ACCOMMODATION_TYPES.EXTENDED_TIME ? (
                <FormField label="Extra time (%)" name="extraTimePercent" value={form.extraTimePercent} onChange={(e) => setForm((p) => ({ ...p, extraTimePercent: e.target.value }))} />
              ) : null}
            </div>
            <FormTextarea label="Notes" name="notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          </FormSection>
          <button type="submit" disabled={saving} className="mt-4 rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">Save accommodation</button>
        </form>
        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead><tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]"><th className="px-4 py-3">Student</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Extra time</th><th className="px-4 py-3">Notes</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">No accommodations recorded yet.</td></tr> : rows.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                    <td className="px-4 py-3 text-[var(--color-afta-text)]">{row.studentName}</td>
                    <td className="px-4 py-3">{ACCOMMODATION_TYPE_LABELS[row.accommodationType] ?? row.accommodationType}</td>
                    <td className="px-4 py-3">{row.extraTimePercent ? `${row.extraTimePercent}%` : "—"}</td>
                    <td className="px-4 py-3">{row.notes || "—"}</td>
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
