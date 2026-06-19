import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField, FormSelect } from "../../components/StudentFormFields.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  downloadLmsImportTemplate,
  getLmsIntegrationSettings,
  importLmsCompletionsFromCsv,
  listLmsCompletions,
  saveLmsIntegrationSettings,
  syncEligibilityFromLmsCompletions,
} from "../../lib/lmsIntegration.js";

const GRADE_PASSBACK_OPTIONS = [
  { value: "manual", label: "Manual queue (admin sends to LMS)" },
  { value: "api", label: "API passback (when connector URL is configured)" },
];

export default function AdminLmsIntegrationPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    enabled: false,
    providerName: "",
    apiBaseUrl: "",
    gradePassbackMode: "manual",
    notes: "",
  });
  const [completions, setCompletions] = useState([]);
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function reload() {
    const [nextSettings, rows] = await Promise.all([getLmsIntegrationSettings(), listLmsCompletions()]);
    setSettings(nextSettings);
    setCompletions(rows);
  }

  useEffect(() => {
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load LMS integration settings."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveSettings(event) {
    event.preventDefault();
    if (!user?.uid) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await saveLmsIntegrationSettings(settings, user.uid);
      setSuccess("LMS integration settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save LMS settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleImport() {
    if (!user?.uid || !csvText.trim()) return;
    setImporting(true);
    setError(null);
    setSuccess(null);
    try {
      const count = await importLmsCompletionsFromCsv(csvText, user.uid);
      setCsvText("");
      setSuccess(`Imported ${count} LMS completion row(s).`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to import LMS completions.");
    } finally {
      setImporting(false);
    }
  }

  async function handleSyncEligibility() {
    if (!user?.uid) return;
    setSyncing(true);
    setError(null);
    setSuccess(null);
    try {
      const { updated } = await syncEligibilityFromLmsCompletions(user.uid);
      setSuccess(`Updated ${updated} eligibility record(s) with LMS completion met.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sync eligibility from LMS data.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <>
      <PageHeader
        title="LMS Integration"
        subtitle="Connector settings, completion sync, and grade passback queue"
        actions={
          <>
            <Link to="/admin/settings" className="app-btn-secondary px-4 py-2 text-xs">
              System settings
            </Link>
            <Link to="/admin/testing/eligibility" className="app-btn-secondary px-4 py-2 text-xs">
              Eligibility review
            </Link>
          </>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="app-error">{error}</p> : null}
        {success ? (
          <p className="rounded-[10px] border border-green-500/30 bg-green-50 px-4 py-3 text-sm text-green-800">
            {success}
          </p>
        ) : null}

        <form onSubmit={handleSaveSettings} className="app-panel grid gap-4 p-5 md:grid-cols-2">
          <h2 className="md:col-span-2 text-sm font-semibold text-[var(--color-afta-text)]">Connector settings</h2>
          <label className="md:col-span-2 flex items-center gap-2 text-sm text-[var(--color-afta-text)]">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(event) => setSettings((current) => ({ ...current, enabled: event.target.checked }))}
            />
            Enable LMS integration
          </label>
          <FormField
            label="LMS provider"
            name="providerName"
            value={settings.providerName}
            onChange={(event) => setSettings((current) => ({ ...current, providerName: event.target.value }))}
            placeholder="e.g. Canvas, Moodle, custom SCORM host"
          />
          <FormField
            label="API base URL"
            name="apiBaseUrl"
            value={settings.apiBaseUrl}
            onChange={(event) => setSettings((current) => ({ ...current, apiBaseUrl: event.target.value }))}
            placeholder="https://lms.example.edu/api/v1"
          />
          <FormSelect
            label="Grade passback mode"
            name="gradePassbackMode"
            value={settings.gradePassbackMode}
            onChange={(event) => setSettings((current) => ({ ...current, gradePassbackMode: event.target.value }))}
            options={GRADE_PASSBACK_OPTIONS}
          />
          <FormField
            label="Notes"
            name="notes"
            value={settings.notes}
            onChange={(event) => setSettings((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Pilot notes, webhook secret location, etc."
          />
          <div className="md:col-span-2">
            <button type="submit" disabled={saving} className="app-btn-primary px-4 py-2 text-xs">
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </form>

        <section className="app-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Completion sync</h2>
              <p className="mt-1 text-sm text-[var(--color-afta-subtle)]">
                Import LMS course completions, then sync eligibility `lmsMet` flags for matching students.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={downloadLmsImportTemplate} className="app-btn-secondary px-4 py-2 text-xs">
                Download CSV template
              </button>
              <button
                type="button"
                onClick={handleSyncEligibility}
                disabled={syncing || loading}
                className="app-btn-primary px-4 py-2 text-xs"
              >
                {syncing ? "Syncing…" : "Sync eligibility from LMS"}
              </button>
            </div>
          </div>
          <textarea
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
            rows={6}
            className="app-input mt-4 w-full font-mono text-xs"
            placeholder="Paste CSV: studentId,courseId,externalCourseId,completedDate,score"
          />
          <button
            type="button"
            onClick={handleImport}
            disabled={importing || !csvText.trim()}
            className="app-btn-secondary mt-3 px-4 py-2 text-xs"
          >
            {importing ? "Importing…" : "Import completions CSV"}
          </button>
        </section>

        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="border-b border-[var(--color-afta-border)] px-4 py-3">
            <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Synced completions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">External ID</th>
                  <th className="px-4 py-3">Completed</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      Loading…
                    </td>
                  </tr>
                ) : completions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      No LMS completions imported yet.
                    </td>
                  </tr>
                ) : (
                  completions.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                      <td className="px-4 py-3">{row.studentId}</td>
                      <td className="px-4 py-3">{row.courseId || "—"}</td>
                      <td className="px-4 py-3">{row.externalCourseId || "—"}</td>
                      <td className="px-4 py-3">{row.completedDate || "—"}</td>
                      <td className="px-4 py-3">{row.score == null ? "—" : row.score}</td>
                      <td className="px-4 py-3">{row.source || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-sm text-[var(--color-afta-subtle)]">
          Grade passback entries are queued automatically when certificates are released (if integration is enabled).
          API passback posts to your LMS when grade passback mode is set to API.
        </p>
        <p className="text-xs text-[var(--color-afta-muted)]">
          LMS completion webhook (POST, header <code className="rounded bg-slate-100 px-1">X-LMS-Secret</code>):{" "}
          <span className="font-mono">https://us-central1-forge-academy-95f84.cloudfunctions.net/lmsCompletionWebhook</span>
        </p>
      </div>
    </>
  );
}
