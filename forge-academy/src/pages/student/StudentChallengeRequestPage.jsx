import { useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField, FormSelect, FormTextarea } from "../../components/StudentFormFields.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  CHALLENGE_REQUEST_TYPE_LABELS,
  CHALLENGE_REQUEST_TYPES,
  CHALLENGE_STATUS_LABELS,
  listChallengeRequestsByStudent,
  submitChallengeTestRequest,
} from "../../lib/challengeTesting.js";
import { getStudentForUser } from "../../lib/students.js";

export default function StudentChallengeRequestPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({
    requestType: CHALLENGE_REQUEST_TYPES.PRIOR_EXPERIENCE,
    certificationTarget: "",
    documentationUrl: "",
    justification: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const student = await getStudentForUser(user);
        if (!student) {
          if (active) setRequests([]);
          return;
        }
        const rows = await listChallengeRequestsByStudent(student.id);
        if (active) setRequests(rows);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load challenge requests.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [user]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await submitChallengeTestRequest(form);
      setSuccess("Challenge request submitted for academy review.");
      setForm({
        requestType: CHALLENGE_REQUEST_TYPES.PRIOR_EXPERIENCE,
        certificationTarget: "",
        documentationUrl: "",
        justification: "",
      });
      const student = await getStudentForUser(user);
      if (student) setRequests(await listChallengeRequestsByStudent(student.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit challenge request.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Challenge Testing" subtitle="Request reciprocity or prior experience evaluation" />
      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="app-error">{error}</p> : null}
        {success ? (
          <p className="rounded-[10px] border border-green-500/30 bg-green-50 px-4 py-3 text-sm text-green-800">
            {success}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="app-panel grid max-w-3xl gap-4 p-5">
          <FormSelect
            label="Request type"
            name="requestType"
            value={form.requestType}
            onChange={(event) => setForm((current) => ({ ...current, requestType: event.target.value }))}
            options={Object.entries(CHALLENGE_REQUEST_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <FormField
            label="Certification you are challenging"
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
            placeholder="Link to transcripts, certificates, or reciprocity paperwork"
          />
          <FormTextarea
            label="Justification"
            name="justification"
            value={form.justification}
            onChange={(event) => setForm((current) => ({ ...current, justification: event.target.value }))}
            rows={5}
          />
          <button type="submit" disabled={saving} className="app-btn-primary w-fit px-5 py-2.5 text-sm disabled:opacity-60">
            {saving ? "Submitting…" : "Submit request"}
          </button>
        </form>

        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="border-b border-[var(--color-afta-border)] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">My challenge requests</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      Loading…
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      No challenge requests on file.
                    </td>
                  </tr>
                ) : (
                  requests.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                      <td className="px-4 py-3">{row.certificationTarget}</td>
                      <td className="px-4 py-3">
                        {CHALLENGE_REQUEST_TYPE_LABELS[row.requestType] ?? row.requestType}
                      </td>
                      <td className="px-4 py-3">{CHALLENGE_STATUS_LABELS[row.status] ?? row.status}</td>
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
