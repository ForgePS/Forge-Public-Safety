import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField, FormSection, FormSelect } from "../../components/StudentFormFields.jsx";
import { listClassSessions } from "../../lib/classes.js";
import { createTestAssignment, publishTestVersion } from "../../lib/onlineTesting.js";
import { listStudents } from "../../lib/students.js";
import { listTestAssignments } from "../../lib/testAssignments.js";
import { listTests } from "../../lib/tests.js";

export default function AdminTestAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [tests, setTests] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({
    testId: "",
    classId: "",
    studentId: "",
    openDate: "",
    closeDate: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  async function reload() {
    setAssignments(await listTestAssignments());
  }

  useEffect(() => {
    Promise.all([reload(), listTests().then(setTests), listClassSessions().then(setClasses), listStudents().then(setStudents)])
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load assignments."))
      .finally(() => setLoading(false));
  }, []);

  async function handlePublishVersion() {
    if (!form.testId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await publishTestVersion(form.testId);
      setMessage(`Published test version ${result.versionNumber}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to publish test version.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await createTestAssignment({
        testId: form.testId,
        classId: form.classId,
        studentId: form.studentId,
        studentIds: form.studentId ? [form.studentId] : [],
        openDate: form.openDate,
        closeDate: form.closeDate,
      });
      setMessage(`Created ${result.assignmentIds?.length ?? 0} assignment(s).`);
      setForm((current) => ({ ...current, studentId: "" }));
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create assignment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Test Assignments"
        subtitle="Publish locked versions and assign exams to classes or individual students"
        actions={<Link to="/admin/testing" className="app-btn-secondary px-4 py-2 text-xs">Testing home</Link>}
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="rounded-[10px] border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">{message}</p> : null}

        <form onSubmit={handleSubmit} className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
          <FormSection title="Assign online test">
            <div className="grid gap-4 md:grid-cols-2">
              <FormSelect label="Test" name="testId" value={form.testId} onChange={(e) => setForm((p) => ({ ...p, testId: e.target.value }))} required>
                <option value="">Select test…</option>
                {tests.map((test) => <option key={test.id} value={test.id}>{test.name}</option>)}
              </FormSelect>
              <FormSelect label="Class (optional)" name="classId" value={form.classId} onChange={(e) => setForm((p) => ({ ...p, classId: e.target.value }))}>
                <option value="">No class scope</option>
                {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.courseNumber} · {cls.startDate}</option>)}
              </FormSelect>
              <FormSelect label="Individual student (optional)" name="studentId" value={form.studentId} onChange={(e) => setForm((p) => ({ ...p, studentId: e.target.value }))}>
                <option value="">Entire class or open assignment</option>
                {students.map((student) => <option key={student.id} value={student.id}>{student.lastName}, {student.firstName}</option>)}
              </FormSelect>
              <FormField label="Open date" name="openDate" type="date" value={form.openDate} onChange={(e) => setForm((p) => ({ ...p, openDate: e.target.value }))} required />
              <FormField label="Close date" name="closeDate" type="date" value={form.closeDate} onChange={(e) => setForm((p) => ({ ...p, closeDate: e.target.value }))} required />
            </div>
          </FormSection>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={saving || !form.testId} onClick={handlePublishVersion} className="app-btn-secondary px-4 py-2 text-xs disabled:opacity-60">
              Publish locked version
            </button>
            <button type="submit" disabled={saving} className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
              Create assignment
            </button>
          </div>
        </form>

        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                  <th className="px-4 py-3">Test</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Window</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">Loading…</td></tr>
                ) : assignments.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">No assignments yet.</td></tr>
                ) : (
                  assignments.map((assignment) => (
                    <tr key={assignment.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                      <td className="px-4 py-3 text-[var(--color-afta-text)]">{assignment.testName}</td>
                      <td className="px-4 py-3">{assignment.studentId ? "Individual" : assignment.classId ? "Class" : "General"}</td>
                      <td className="px-4 py-3">{assignment.openDate} – {assignment.closeDate}</td>
                      <td className="px-4 py-3">{assignment.status}</td>
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
