import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField } from "../../components/StudentFormFields.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTenantOptional } from "../../context/TenantContext.jsx";
import { DEFAULT_ACADEMY_ID } from "../../data/defaultAcademy.js";
import { FORGE_RMS_PLATFORM_TENANT_ID } from "../../lib/forgeEcosystem.js";
import { getStoredActiveAcademyId } from "../../lib/academyTenancy.js";
import {
  approveHubFemaSidCorrection,
  getDefaultRmsIntegrationSettings,
  getHubSyncStatus,
  getRmsIntegrationEndpoints,
  getRmsIntegrationSettings,
  listRmsRosterSyncLog,
  listRmsTrainingSyncLog,
  pullRosterFromRms,
  rejectHubFemaSidCorrection,
  requestHubResync,
  resolveHubDuplicateReview,
  saveRmsIntegrationSettings,
  verifyHubPersonIdentity,
} from "../../lib/rmsIntegration.js";

/** @param {unknown} error */
function formatRmsError(error, fallback) {
  if (!error || typeof error !== "object") {
    return error instanceof Error ? error.message : fallback;
  }
  const code = "code" in error ? String(error.code) : "";
  if (code === "permission-denied" || code === "functions/permission-denied") {
    return "Firestore blocked this action. Confirm your users profile role is creator (or academy_admin), then deploy the latest firestore.rules to forge-academy-95f84.";
  }
  if (code === "functions/internal" && error instanceof Error) {
    return error.message.replace(/^Firebase: |^internal\s*/i, "") || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default function AdminRmsIntegrationPage() {
  const { user } = useAuth();
  const tenant = useTenantOptional();
  const academyId =
    tenant?.isPlatformScope
      ? DEFAULT_ACADEMY_ID
      : (tenant?.activeAcademyId ?? getStoredActiveAcademyId() ?? DEFAULT_ACADEMY_ID);

  const [settings, setSettings] = useState(() => getDefaultRmsIntegrationSettings());
  const [endpoints, setEndpoints] = useState(null);
  const [rosterLog, setRosterLog] = useState([]);
  const [trainingLog, setTrainingLog] = useState([]);
  const [hubStatus, setHubStatus] = useState(null);
  const [hubStatusError, setHubStatusError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [identityBusy, setIdentityBusy] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function reload() {
    const nextSettings = await getRmsIntegrationSettings(academyId);
    setSettings(nextSettings);
    setEndpoints(getRmsIntegrationEndpoints());

    const [rosterRows, trainingRows] = await Promise.all([
      listRmsRosterSyncLog(),
      listRmsTrainingSyncLog(academyId),
    ]);
    setRosterLog(rosterRows);
    setTrainingLog(trainingRows);

    if (nextSettings.hubBaseUrl && nextSettings.hubEnabled !== false) {
      try {
        const status = await getHubSyncStatus();
        setHubStatus(status);
        setHubStatusError(null);
      } catch (err) {
        setHubStatus(null);
        setHubStatusError(formatRmsError(err, "Unable to reach Integration Hub."));
      }
    } else {
      setHubStatus(null);
      setHubStatusError(null);
    }
  }

  useEffect(() => {
    setLoading(true);
    reload()
      .catch((err) => setError(formatRmsError(err, "Unable to load RMS integration settings.")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when academy workspace changes
  }, [academyId]);

  async function handleSaveSettings(event) {
    event.preventDefault();
    if (!user?.uid) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await saveRmsIntegrationSettings(settings, user.uid, academyId);
      setSuccess("Forge RMS / Integration Hub settings saved.");
      await reload();
    } catch (err) {
      setError(formatRmsError(err, "Unable to save RMS settings."));
    } finally {
      setSaving(false);
    }
  }

  async function handlePullRoster() {
    if (!user?.uid) return;
    setPulling(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await pullRosterFromRms(user.uid);
      const via = result.via ? ` (via ${result.via})` : "";
      setSuccess(
        `Roster sync complete${via} — ${result.created ?? result.accepted ?? 0} created/accepted, ${result.updated ?? 0} updated, ${result.skipped ?? 0} skipped.`,
      );
      await reload();
    } catch (err) {
      setError(formatRmsError(err, "Unable to pull roster from Forge RMS."));
    } finally {
      setPulling(false);
    }
  }

  async function handleHubResync() {
    if (!user?.uid) return;
    setResyncing(true);
    setError(null);
    setSuccess(null);
    try {
      const failure = hubStatus?.openFailures?.[0];
      const failureId = failure?.id;
      const isRosterResyncPlaceholder =
        failure?.payload?.data?.resync === true && !failure?.payload?.data?.firstName;

      // Empty "resync" failures are cleared by running a real RMS roster pull.
      if (!failureId || isRosterResyncPlaceholder) {
        const result = await pullRosterFromRms(user.uid);
        if (failureId) {
          await requestHubResync({ eventId: failureId }, user.uid).catch(() => null);
        }
        setSuccess(
          `Roster pull complete — ${result.created ?? result.accepted ?? 0} created/accepted, ${result.updated ?? 0} updated.`,
        );
      } else {
        await requestHubResync({ eventId: failureId }, user.uid);
        setSuccess(`Hub resync queued for ${failureId}.`);
      }
      await reload();
    } catch (err) {
      setError(formatRmsError(err, "Unable to request Hub resync."));
    } finally {
      setResyncing(false);
    }
  }

  async function handleResolveDuplicate(review, decision) {
    if (!review?.id) return;
    setIdentityBusy(review.id);
    setError(null);
    setSuccess(null);
    try {
      const candidates = review.candidateIds || [];
      const body = {
        reviewId: review.id,
        decision,
        survivorPersonId: candidates[0],
        loserPersonId: candidates[1],
        linkPersonId: candidates[0],
        actor: user?.uid,
      };
      await resolveHubDuplicateReview(body);
      setSuccess(`Duplicate review ${review.id} resolved (${decision}).`);
      await reload();
    } catch (err) {
      setError(formatRmsError(err, "Unable to resolve duplicate review."));
    } finally {
      setIdentityBusy(null);
    }
  }

  async function handleVerifyPerson(personId) {
    if (!personId) return;
    setIdentityBusy(personId);
    setError(null);
    setSuccess(null);
    try {
      await verifyHubPersonIdentity(personId, { verifyFemaSid: true, actor: user?.uid });
      setSuccess(`Identity ${personId} verified.`);
      await reload();
    } catch (err) {
      setError(formatRmsError(err, "Unable to verify identity."));
    } finally {
      setIdentityBusy(null);
    }
  }

  async function handleFemaCorrection(correctionId, action) {
    if (!correctionId) return;
    setIdentityBusy(correctionId);
    setError(null);
    setSuccess(null);
    try {
      if (action === "approve") {
        await approveHubFemaSidCorrection(correctionId);
        setSuccess(`FEMA SID correction ${correctionId} approved.`);
      } else {
        await rejectHubFemaSidCorrection(correctionId, "Rejected from Academy admin UI");
        setSuccess(`FEMA SID correction ${correctionId} rejected.`);
      }
      await reload();
    } catch (err) {
      setError(formatRmsError(err, "Unable to process FEMA SID correction."));
    } finally {
      setIdentityBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Forge Public Safety RMS"
        subtitle="Academy ↔ RMS via Forge Integration Hub — personnel, connections, and training passback"
        actions={
          <Link to="/admin/testing" className="app-btn-secondary px-4 py-2 text-xs">
            Testing home
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-6 p-6 lg:p-7">
        {error ? <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {success ? (
          <div className="rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
        ) : null}

        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Integration Hub status</h2>
              <p className="mt-1 text-xs text-[var(--color-afta-muted)]">
                Sync state, failures, and duplicate reviews from the central Hub. Configure Hub URL below to enable.
              </p>
            </div>
            <button
              type="button"
              disabled={resyncing || loading || !settings.hubBaseUrl}
              onClick={handleHubResync}
              className="app-btn-secondary px-4 py-2 text-xs disabled:opacity-60"
            >
              {resyncing ? "Resyncing…" : "Manual resync"}
            </button>
          </div>
          {hubStatusError ? (
            <p className="mt-4 text-sm text-amber-700">{hubStatusError}</p>
          ) : hubStatus ? (
            <dl className="mt-4 grid gap-3 text-xs md:grid-cols-4">
              <div className="rounded-[10px] border border-[var(--color-afta-border)] px-3 py-2">
                <dt className="text-[var(--color-afta-muted)]">Active connections</dt>
                <dd className="mt-1 text-lg font-semibold text-[var(--color-afta-text)]">{hubStatus.activeConnections ?? 0}</dd>
              </div>
              <div className="rounded-[10px] border border-[var(--color-afta-border)] px-3 py-2">
                <dt className="text-[var(--color-afta-muted)]">Open failures</dt>
                <dd className="mt-1 text-lg font-semibold text-[var(--color-afta-text)]">
                  {hubStatus.openFailures?.length ?? 0}
                </dd>
              </div>
              <div className="rounded-[10px] border border-[var(--color-afta-border)] px-3 py-2">
                <dt className="text-[var(--color-afta-muted)]">Duplicate reviews</dt>
                <dd className="mt-1 text-lg font-semibold text-[var(--color-afta-text)]">
                  {hubStatus.pendingDuplicateReviews?.length ?? 0}
                </dd>
              </div>
              <div className="rounded-[10px] border border-[var(--color-afta-border)] px-3 py-2">
                <dt className="text-[var(--color-afta-muted)]">FEMA SID corrections</dt>
                <dd className="mt-1 text-lg font-semibold text-[var(--color-afta-text)]">
                  {hubStatus.pendingFemaSidCorrections?.length ?? 0}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-[var(--color-afta-subtle)]">
              Hub status unavailable until Hub base URL is saved and the Hub service is running.
            </p>
          )}

          {hubStatus?.pendingDuplicateReviews?.length ? (
            <div className="mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">
                Person Identity — duplicate reviews
              </h3>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="text-[var(--color-afta-muted)]">
                    <tr>
                      <th className="px-3 py-2">Review</th>
                      <th className="px-3 py-2">Reason</th>
                      <th className="px-3 py-2">Candidates</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hubStatus.pendingDuplicateReviews.slice(0, 15).map((row) => (
                      <tr key={row.id} className="border-t border-[var(--color-afta-border)]">
                        <td className="px-3 py-2 font-mono">{row.id}</td>
                        <td className="px-3 py-2">{row.reason || "—"}</td>
                        <td className="px-3 py-2 font-mono">
                          {(row.candidateIds || []).slice(0, 3).join(", ") || "—"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="app-btn-secondary px-2 py-1 text-[11px] disabled:opacity-60"
                              disabled={identityBusy === row.id}
                              onClick={() => handleResolveDuplicate(row, "merge")}
                            >
                              Merge
                            </button>
                            <button
                              type="button"
                              className="app-btn-secondary px-2 py-1 text-[11px] disabled:opacity-60"
                              disabled={identityBusy === row.id}
                              onClick={() => handleResolveDuplicate(row, "keep_separate")}
                            >
                              Keep separate
                            </button>
                            <button
                              type="button"
                              className="app-btn-secondary px-2 py-1 text-[11px] disabled:opacity-60"
                              disabled={identityBusy === row.id || !(row.candidateIds || [])[0]}
                              onClick={() => handleResolveDuplicate(row, "link_existing")}
                            >
                              Link existing
                            </button>
                            {(row.candidateIds || [])[0] ? (
                              <button
                                type="button"
                                className="app-btn-secondary px-2 py-1 text-[11px] disabled:opacity-60"
                                disabled={identityBusy === row.candidateIds[0]}
                                onClick={() => handleVerifyPerson(row.candidateIds[0])}
                              >
                                Verify first
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {hubStatus?.pendingFemaSidCorrections?.length ? (
            <div className="mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">
                Person Identity — FEMA SID corrections
              </h3>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="text-[var(--color-afta-muted)]">
                    <tr>
                      <th className="px-3 py-2">Case</th>
                      <th className="px-3 py-2">Person</th>
                      <th className="px-3 py-2">Previous → New</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hubStatus.pendingFemaSidCorrections.slice(0, 15).map((row) => (
                      <tr key={row.id} className="border-t border-[var(--color-afta-border)]">
                        <td className="px-3 py-2 font-mono">{row.id}</td>
                        <td className="px-3 py-2 font-mono">{row.personId || row.forgePersonId || "—"}</td>
                        <td className="px-3 py-2 font-mono">
                          {row.previousFemaSidNormalized || "—"} → {row.newFemaSidNormalized || "—"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="app-btn-secondary px-2 py-1 text-[11px] disabled:opacity-60"
                              disabled={identityBusy === row.id}
                              onClick={() => handleFemaCorrection(row.id, "approve")}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="app-btn-secondary px-2 py-1 text-[11px] disabled:opacity-60"
                              disabled={identityBusy === row.id}
                              onClick={() => handleFemaCorrection(row.id, "reject")}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {hubStatus?.openFailures?.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="text-[var(--color-afta-muted)]">
                  <tr>
                    <th className="px-3 py-2">Event</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {hubStatus.openFailures.slice(0, 10).map((row) => (
                    <tr key={row.id} className="border-t border-[var(--color-afta-border)]">
                      <td className="px-3 py-2 font-mono">{row.eventId || row.id}</td>
                      <td className="px-3 py-2">{row.eventType || "—"}</td>
                      <td className="px-3 py-2">{row.status || "failed"}</td>
                      <td className="px-3 py-2">{row.error || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <form onSubmit={handleSaveSettings} className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Platform connection</h2>
          <p className="mt-1 text-xs text-[var(--color-afta-muted)]">
            Prefer routing through the Integration Hub. Shared IDs: <code>forgePersonId</code>,{" "}
            <code>forgeDepartmentId</code>, plus legacy <code>rmsPersonId</code>.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-[var(--color-afta-text)] md:col-span-2">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(event) => setSettings((current) => ({ ...current, enabled: event.target.checked }))}
              />
              Enable Forge RMS integration
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--color-afta-text)] md:col-span-2">
              <input
                type="checkbox"
                checked={settings.hubEnabled !== false}
                onChange={(event) => setSettings((current) => ({ ...current, hubEnabled: event.target.checked }))}
              />
              Route sync through Integration Hub
            </label>

            <FormField
              label="Integration Hub base URL"
              value={settings.hubBaseUrl}
              onChange={(event) => setSettings((current) => ({ ...current, hubBaseUrl: event.target.value }))}
              placeholder="https://forge-integration-hub-xxxxx.run.app"
            />
            <FormField
              label="Forge department ID"
              value={settings.forgeDepartmentId}
              onChange={(event) => setSettings((current) => ({ ...current, forgeDepartmentId: event.target.value }))}
              hint="Connection id in Hub (default forge-platform)."
            />
            <FormField
              label="Hub Bearer token"
              value={settings.hubBearerToken}
              onChange={(event) => setSettings((current) => ({ ...current, hubBearerToken: event.target.value }))}
            />
            <FormField
              label="Hub shared secret"
              value={settings.hubSecret}
              onChange={(event) => setSettings((current) => ({ ...current, hubSecret: event.target.value }))}
              hint="Used for Hub → Academy hubAcademyCommand auth."
            />

            <FormField
              label="Forge RMS Cloud Functions base URL"
              value={settings.apiBaseUrl}
              onChange={(event) => setSettings((current) => ({ ...current, apiBaseUrl: event.target.value }))}
              placeholder="https://us-central1-rms-dashboard-7562e.cloudfunctions.net"
            />
            <FormField
              label="RMS platform tenant ID"
              value={settings.tenantId}
              onChange={(event) => setSettings((current) => ({ ...current, tenantId: event.target.value }))}
              hint={`Default ${FORGE_RMS_PLATFORM_TENANT_ID}`}
            />
            <FormField
              label="Inbound webhook secret"
              value={settings.webhookSecret}
              onChange={(event) => setSettings((current) => ({ ...current, webhookSecret: event.target.value }))}
            />
            <FormField
              label="Outbound API secret"
              value={settings.outboundSecret}
              onChange={(event) => setSettings((current) => ({ ...current, outboundSecret: event.target.value }))}
            />
            <FormField
              label="Default academy for imports"
              value={settings.defaultAcademyId}
              onChange={(event) => setSettings((current) => ({ ...current, defaultAcademyId: event.target.value }))}
            />

            <label className="flex items-center gap-2 text-sm text-[var(--color-afta-text)]">
              <input
                type="checkbox"
                checked={settings.autoCreateStudents}
                onChange={(event) => setSettings((current) => ({ ...current, autoCreateStudents: event.target.checked }))}
              />
              Auto-create students from platform roster
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--color-afta-text)]">
              <input
                type="checkbox"
                checked={settings.mapDepartmentsOnSync}
                onChange={(event) => setSettings((current) => ({ ...current, mapDepartmentsOnSync: event.target.checked }))}
              />
              Map RMS departments to Academy departments
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--color-afta-text)] md:col-span-2">
              <input
                type="checkbox"
                checked={settings.syncTrainingOnCertificateRelease}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, syncTrainingOnCertificateRelease: event.target.checked }))
                }
              />
              Sync training / certificates through Hub (or direct RMS fallback)
            </label>

            <FormField
              className="md:col-span-2"
              label="Notes"
              value={settings.notes}
              onChange={(event) => setSettings((current) => ({ ...current, notes: event.target.value }))}
              multiline
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="submit" disabled={saving || loading} className="app-btn-primary px-4 py-2 text-xs disabled:opacity-60">
              {saving ? "Saving…" : "Save settings"}
            </button>
            <button
              type="button"
              disabled={pulling || loading || !settings.enabled}
              onClick={handlePullRoster}
              className="app-btn-secondary px-4 py-2 text-xs disabled:opacity-60"
            >
              {pulling ? "Pulling roster…" : "Pull platform roster from Forge RMS"}
            </button>
          </div>
        </form>

        {endpoints ? (
          <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Endpoints</h2>
            <dl className="mt-4 grid gap-3 text-xs text-[var(--color-afta-subtle)]">
              <div>
                <dt className="font-semibold text-[var(--color-afta-text)]">Integration Hub API</dt>
                <dd className="mt-1 break-all">
                  {(settings.hubBaseUrl || "(configure hubBaseUrl)") + endpoints.hubApiBase}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--color-afta-text)]">Academy Hub command (Hub → Academy)</dt>
                <dd className="mt-1 break-all">POST {endpoints.academyHubCommand}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--color-afta-text)]">Academy roster webhook (compat)</dt>
                <dd className="mt-1 break-all">POST {endpoints.academyPersonnelWebhook}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--color-afta-text)]">Forge RMS hosting</dt>
                <dd className="mt-1 break-all">{endpoints.rmsHostingUrl}</dd>
              </div>
            </dl>
          </section>
        ) : null}

        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Recent roster syncs</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="text-[var(--color-afta-muted)]">
                <tr>
                  <th className="px-3 py-2">Tenant</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Via</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">Updated</th>
                  <th className="px-3 py-2">Errors</th>
                </tr>
              </thead>
              <tbody>
                {rosterLog.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-[var(--color-afta-subtle)]">
                      No roster sync activity yet.
                    </td>
                  </tr>
                ) : (
                  rosterLog.map((row) => (
                    <tr key={row.id} className="border-t border-[var(--color-afta-border)]">
                      <td className="px-3 py-2">{row.tenantId ?? FORGE_RMS_PLATFORM_TENANT_ID}</td>
                      <td className="px-3 py-2">{row.source ?? "webhook"}</td>
                      <td className="px-3 py-2">{row.via ?? "local"}</td>
                      <td className="px-3 py-2">{row.created ?? row.accepted ?? 0}</td>
                      <td className="px-3 py-2">{row.updated ?? 0}</td>
                      <td className="px-3 py-2">{row.errorCount ?? 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Training sync log</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="text-[var(--color-afta-muted)]">
                <tr>
                  <th className="px-3 py-2">Course</th>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Completed</th>
                  <th className="px-3 py-2">Via</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {trainingLog.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-[var(--color-afta-subtle)]">
                      No training sync entries yet.
                    </td>
                  </tr>
                ) : (
                  trainingLog.map((row) => (
                    <tr key={row.id} className="border-t border-[var(--color-afta-border)]">
                      <td className="px-3 py-2">{row.courseName || row.courseNumber || "—"}</td>
                      <td className="px-3 py-2">{row.studentId || "—"}</td>
                      <td className="px-3 py-2">{row.completedDate || "—"}</td>
                      <td className="px-3 py-2">{row.via || "—"}</td>
                      <td className="px-3 py-2">{row.status || "queued"}</td>
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
