import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField, FormSection, FormSelect } from "../../components/StudentFormFields.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { listClassSessions } from "../../lib/classes.js";
import { createTestingWindow, listTestingWindows, TESTING_WINDOW_STATUSES, TESTING_WINDOW_STATUS_LABELS, updateTestingWindow } from "../../lib/testingWindows.js";
import { listTests } from "../../lib/tests.js";

const emptyForm = {
  testId: "",
  classId: "",
  openDateTime: "",
  closeDateTime: "",
  timezone: "America/Chicago",
  status: TESTING_WINDOW_STATUSES.SCHEDULED,
};

export default function AdminTestingWindowsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [tests, setTests] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function reload() {
    setRows(await listTestingWindows());
  }

  useEffect(() => {
    Promise.all([reload(), listTests().then(setTests), listClassSessions().then(setClasses)])
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load testing windows."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    const test = tests.find((item) => item.id === form.testId);
    try {
      await createTestingWindow({ ...form, testName: test?.name ?? "" }, user.uid);
      setForm(emptyForm);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create testing window.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(windowId, status) {
    if (!user) return;
    await updateTestingWindow(windowId, { status }, user.uid);
    await reload();
  }

  return (
    <>
      <PageHeader title="Testing Windows" subtitle="Schedule when exams open and close" actions={<Link to="/admin/testing" className="app-btn-secondary px-4 py-2 text-xs">Testing home</Link>} />
      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        <form onSubmit={handleSubmit} className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
          <FormSection title="Schedule testing window">
            <div className="grid gap-4 md:grid-cols-2">
              <FormSelect label="Test" name="testId" value={form.testId} onChange={(e) => setForm((p) => ({ ...p, testId: e.target.value }))} required>
                <option value="">Select test…</option>
                {tests.map((test) => <option key={test.id} value={test.id}>{test.name}</option>)}
              </FormSelect>
              <FormSelect label="Class" name="classId" value={form.classId} onChange={(e) => setForm((p) => ({ ...p, classId: e.target.value }))}>
                <option value="">Optional class…</option>
                {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.courseNumber} · {cls.startDate}</option>)}
              </FormSelect>
              <FormField label="Open (local datetime)" name="openDateTime" type="datetime-local" value={form.openDateTime} onChange={(e) => setForm((p) => ({ ...p, openDateTime: e.target.value }))} required />
              <FormField label="Close (local datetime)" name="closeDateTime" type="datetime-local" value={form.closeDateTime} onChange={(e) => setForm((p) => ({ ...p, closeDateTime: e.target.value }))} required />
              <FormField label="Timezone" name="timezone" value={form.timezone} onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))} />
            </div>
          </FormSection>
          <button type="submit" disabled={saving} className="mt-4 rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">Create window</button>
        </form>
        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead><tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]"><th className="px-4 py-3">Test</th><th className="px-4 py-3">Open</th><th className="px-4 py-3">Close</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">No testing windows yet.</td></tr> : rows.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                    <td className="px-4 py-3 text-[var(--color-afta-text)]">{row.testName}</td>
                    <td className="px-4 py-3">{row.openDateTime}</td>
                    <td className="px-4 py-3">{row.closeDateTime}</td>
                    <td className="px-4 py-3">{TESTING_WINDOW_STATUS_LABELS[row.status] ?? row.status}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button type="button" onClick={() => updateStatus(row.id, TESTING_WINDOW_STATUSES.OPEN)} className="text-xs text-[#c8102e]">Open</button>
                      <button type="button" onClick={() => updateStatus(row.id, TESTING_WINDOW_STATUSES.CLOSED)} className="text-xs text-[var(--color-afta-subtle)]">Close</button>
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
