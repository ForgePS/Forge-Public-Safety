import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField, FormSelect, FormTextarea } from "../../components/StudentFormFields.jsx";
import { listStudents } from "../../lib/students.js";
import {
  CHALLENGE_REQUEST_TYPE_LABELS,
  CHALLENGE_REQUEST_TYPES,
  CHALLENGE_STATUS_LABELS,
  listChallengeTestRequests,
  reviewChallengeTestRequest,
  submitChallengeTestRequest,
} from "../../lib/challengeTesting.js";

const emptyAdminForm = {
  studentId: "",
  requestType: CHALLENGE_REQUEST_TYPES.PRIOR_EXPERIENCE,
  certificationTarget: "",
  documentationUrl: "",
  justification: "",
};

export default function AdminChallengeTestingPage() {
  const [rows, setRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyAdminForm);
  const [filter, setFilter] = useState("requested");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function reload() {
    const [requests, roster] = await Promise.all([
      listChallengeTestRequests(filter || undefined),
      listStudents(),
    ]);
    setRows(requests);
    setStudents(roster);
  }

  useEffect(() => {
    setLoading(true);
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load challenge requests."))
      .finally(() => setLoading(false));
  }, [filter]);

  async function handleCreate(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await submitChallengeTestRequest(form);
      setForm(emptyAdminForm);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create challenge request.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReview(requestId, decision) {
    const reviewNotes = window.prompt("Review notes (optional):") ?? "";
    const outcome = decision === "completed" ? window.prompt("Outcome summary:") ?? "" : "";
    try {
      await reviewChallengeTestRequest(requestId, decision, reviewNotes, outcome);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update challenge request.");
    }
  }

  return (
    <>
      <PageHeader
        title="Challenge Testing"
        subtitle="Reciprocity, prior experience, and direct certification requests"
        actions={
          <Link to="/admin/testing/results-hub" className="app-btn-secondary px-4 py-2 text-xs">
            Results hub
          </Link>
        }
      />
      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="app-error">{error}</p> : null}

        <form onSubmit={handleCreate} className="app-panel grid gap-4 p-5 md:grid-cols-2">
          <h2 className="md:col-span-2 text-sm font-semibold text-[var(--color-afta-text)]">Create challenge request</h2>
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
          <FormSelect
            label="Request type"
            name="requestType"
            value={form.requestType}
            onChange={(event) => setForm((current) => ({ ...current, requestType: event.target.value }))}
            options={Object.entries(CHALLENGE_REQUEST_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <FormField
            label="Certification target"
            name="certificationTarget"
            value={form.certificationTarget}
            onChange={(event) => setForm((current) => ({ ...current, certificationTarget: event.target.value }))}
            required
          />
          <FormField
            label="Documentation URL"
            name="documentationUrl"
            value={form.documentationUrl}
            onChange={(event) => setForm((current) => ({ ...current, documentationUrl: event.target.value }))}
          />
          <div className="md:col-span-2">
            <FormTextarea
              label="Justification"
              name="justification"
              value={form.justification}
              onChange={(event) => setForm((current) => ({ ...current, justification: event.target.value }))}
              rows={4}
            />
          </div>
          <div className="md:col-span-2">
            <button type="submit" disabled={saving} className="app-btn-primary px-5 py-2.5 text-sm disabled:opacity-60">
              {saving ? "Saving…" : "Submit challenge request"}
            </button>
          </div>
        </form>

        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-afta-border)] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Challenge requests</h2>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="app-input w-auto py-2 text-xs"
            >
              <option value="">All statuses</option>
              {Object.entries(CHALLENGE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      No challenge requests found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                      <td className="px-4 py-3">{row.studentName || row.studentId}</td>
                      <td className="px-4 py-3">
                        {CHALLENGE_REQUEST_TYPE_LABELS[row.requestType] ?? row.requestType}
                      </td>
                      <td className="px-4 py-3">{row.certificationTarget}</td>
                      <td className="px-4 py-3">{CHALLENGE_STATUS_LABELS[row.status] ?? row.status}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {row.status === "requested" ? (
                            <>
                              <button type="button" onClick={() => handleReview(row.id, "approved")} className="text-xs text-green-700">
                                Approve
                              </button>
                              <button type="button" onClick={() => handleReview(row.id, "denied")} className="text-xs text-[#c8102e]">
                                Deny
                              </button>
                            </>
                          ) : null}
                          {row.status === "approved" ? (
                            <button type="button" onClick={() => handleReview(row.id, "completed")} className="text-xs text-sky-700">
                              Mark completed
                            </button>
                          ) : null}
                        </div>
                      </td>
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
