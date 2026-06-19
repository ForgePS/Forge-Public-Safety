import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField, FormSelect } from "../../components/StudentFormFields.jsx";
import { listStudents } from "../../lib/students.js";
import {
  STATE_CERT_PASS_FAIL_LABELS,
  listStateCertificationTests,
  recordStateCertificationTest,
} from "../../lib/stateCertificationTests.js";

const emptyForm = {
  studentId: "",
  certificationType: "",
  examDate: new Date().toISOString().slice(0, 10),
  score: "",
  passFail: "pending",
  attemptNumber: "1",
  documentationUrl: "",
};

export default function AdminStateCertificationPage() {
  const [rows, setRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const studentMap = useMemo(
    () => new Map(students.map((student) => [student.id, `${student.lastName}, ${student.firstName}`])),
    [students],
  );

  async function reload() {
    const [records, roster] = await Promise.all([listStateCertificationTests(), listStudents()]);
    setRows(records);
    setStudents(roster);
  }

  useEffect(() => {
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load state certification records."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await recordStateCertificationTest({
        studentId: form.studentId,
        certificationType: form.certificationType.trim(),
        examDate: form.examDate,
        score: form.score === "" ? null : Number(form.score),
        passFail: form.passFail,
        attemptNumber: Number(form.attemptNumber || 1),
        documentationUrl: form.documentationUrl.trim(),
      });
      setForm(emptyForm);
      setSuccess("State certification test recorded.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to record state certification test.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="State Certification Testing"
        subtitle="Record state written/practical exam outcomes"
        actions={
          <Link to="/admin/testing/results-hub" className="app-btn-secondary px-4 py-2 text-xs">
            Results hub
          </Link>
        }
      />
      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="app-error">{error}</p> : null}
        {success ? (
          <p className="rounded-[10px] border border-green-500/30 bg-green-50 px-4 py-3 text-sm text-green-800">
            {success}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="app-panel grid gap-4 p-5 md:grid-cols-2">
          <h2 className="md:col-span-2 text-sm font-semibold text-[var(--color-afta-text)]">Record state exam</h2>
          <FormSelect
            label="Student"
            name="studentId"
            value={form.studentId}
            onChange={(event) => setForm((current) => ({ ...current, studentId: event.target.value }))}
            required
            options={[
              { value: "", label: "Select student…" },
              ...students.map((student) => ({
                value: student.id,
                label: `${student.lastName}, ${student.firstName}`,
              })),
            ]}
          />
          <FormField
            label="Certification type"
            name="certificationType"
            value={form.certificationType}
            onChange={(event) => setForm((current) => ({ ...current, certificationType: event.target.value }))}
            required
            placeholder="e.g. Firefighter I Written"
          />
          <FormField
            label="Exam date"
            name="examDate"
            type="date"
            value={form.examDate}
            onChange={(event) => setForm((current) => ({ ...current, examDate: event.target.value }))}
            required
          />
          <FormField
            label="Score"
            name="score"
            type="number"
            value={form.score}
            onChange={(event) => setForm((current) => ({ ...current, score: event.target.value }))}
            placeholder="Optional numeric score"
          />
          <FormSelect
            label="Pass / fail"
            name="passFail"
            value={form.passFail}
            onChange={(event) => setForm((current) => ({ ...current, passFail: event.target.value }))}
            options={Object.entries(STATE_CERT_PASS_FAIL_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <FormField
            label="Attempt number"
            name="attemptNumber"
            type="number"
            value={form.attemptNumber}
            onChange={(event) => setForm((current) => ({ ...current, attemptNumber: event.target.value }))}
            required
          />
          <FormField
            label="Documentation URL"
            name="documentationUrl"
            value={form.documentationUrl}
            onChange={(event) => setForm((current) => ({ ...current, documentationUrl: event.target.value }))}
            placeholder="Link to supporting documentation"
          />
          <div className="md:col-span-2">
            <button type="submit" disabled={saving} className="app-btn-primary px-5 py-2.5 text-sm disabled:opacity-60">
              {saving ? "Saving…" : "Record state exam"}
            </button>
          </div>
        </form>

        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="border-b border-[var(--color-afta-border)] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">State certification records</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Certification</th>
                  <th className="px-4 py-3">Exam date</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3">Attempt</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      No state certification records yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                      <td className="px-4 py-3">{studentMap.get(row.studentId) ?? row.studentId}</td>
                      <td className="px-4 py-3">{row.certificationType}</td>
                      <td className="px-4 py-3">{row.examDate}</td>
                      <td className="px-4 py-3">{row.score ?? "—"}</td>
                      <td className="px-4 py-3">{STATE_CERT_PASS_FAIL_LABELS[row.passFail] ?? row.passFail}</td>
                      <td className="px-4 py-3">#{row.attemptNumber ?? 1}</td>
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
