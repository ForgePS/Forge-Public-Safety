import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/PageHeader.jsx";
import ForgeEcosystemOverview from "../../components/ForgeEcosystemOverview.jsx";
import {
  PILOT_HOSTING_URL,
  PILOT_MANUAL_CHECKS,
  PILOT_TRAINING_MODULES,
  PILOT_VERSION,
  loadManualCheckState,
  runPilotSmokeChecks,
  saveManualCheckState,
} from "../../lib/pilot.js";

const DEPLOY_STEPS = [
  "Copy `.env.example` to `.env` and fill Firebase web app keys from the Firebase console.",
  "Run `npm install` in the `forge-academy` directory.",
  "Optional: seed pilot demo data with `npm run pilot:seed` (requires a service account JSON).",
  "Run `npm run build` and fix any build errors before deploying.",
  "Deploy hosting and Firestore rules: `npm run deploy`.",
  "Sign in as an academy admin and open Admin → Pilot Release to run smoke checks.",
  "Complete the manual checklist and role-based training walkthroughs with pilot users.",
];

const MIGRATION_NOTES = [
  "Pilot data lives in Firebase project `forge-academy-95f84` — separate from the main Forge Public Safety site.",
  "Create Firebase Auth users first, then matching `users/{uid}` documents with the correct `role` field.",
  "Link students via `students.userId` and instructors via `instructors.userId` for portal dashboards to load.",
  "Department users need `users.departmentId` pointing at an existing `departments` document.",
  "Historical spreadsheet imports are out of scope for pilot — use admin forms or the seed script for baseline records.",
  "After schema changes, redeploy rules with `npm run deploy:rules` before retesting affected workflows.",
  "Forge Academy is separate from Forge RMS and ForgePS/Dashboard — integrate via APIs later, not shared Firestore.",
  "Campus TV signage is managed in Admin → Digital Dashboard; org-wide RMS displays live in the ForgePS/Dashboard repo.",
];

function statusClasses(status) {
  if (status === "pass") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (status === "warn") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-[#c8102e]/30 bg-[#c8102e]/10 text-red-700";
}

export default function AdminPilotReleasePage() {
  const [activeTab, setActiveTab] = useState("testing");
  const [smokeResults, setSmokeResults] = useState([]);
  const [smokeLoading, setSmokeLoading] = useState(false);
  const [smokeRanAt, setSmokeRanAt] = useState(null);
  const [manualChecks, setManualChecks] = useState(() => loadManualCheckState());

  useEffect(() => {
    saveManualCheckState(manualChecks);
  }, [manualChecks]);

  const manualComplete = useMemo(
    () => PILOT_MANUAL_CHECKS.filter((item) => manualChecks[item.id]).length,
    [manualChecks],
  );

  const smokeSummary = useMemo(() => {
    const failed = smokeResults.filter((item) => item.status === "fail").length;
    const warnings = smokeResults.filter((item) => item.status === "warn").length;
    return { failed, warnings, passed: smokeResults.length - failed - warnings };
  }, [smokeResults]);

  async function handleRunSmokeChecks() {
    setSmokeLoading(true);
    try {
      const results = await runPilotSmokeChecks();
      setSmokeResults(results);
      setSmokeRanAt(new Date());
    } finally {
      setSmokeLoading(false);
    }
  }

  function toggleManualCheck(id) {
    setManualChecks((current) => ({ ...current, [id]: !current[id] }));
  }

  const tabs = [
    { id: "testing", label: "Testing" },
    { id: "training", label: "Training" },
    { id: "deployment", label: "Deployment" },
    { id: "migration", label: "Migration" },
    { id: "ecosystem", label: "Ecosystem" },
  ];

  return (
    <>
      <PageHeader
        title="Pilot Release"
        subtitle={`Forge Academy ${PILOT_VERSION} — go-live readiness`}
        actions={
          <a
            href={PILOT_HOSTING_URL}
            target="_blank"
            rel="noreferrer"
            className="app-btn-secondary px-4 py-2 text-xs"
          >
            Open hosted app
          </a>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                "rounded-[10px] px-4 py-2 text-xs font-semibold transition-colors",
                activeTab === tab.id
                  ? "bg-[#c8102e] text-white"
                  : "border border-[var(--color-afta-border)] text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)]",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "testing" ? (
          <div className="flex flex-col gap-5">
            <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Automated smoke checks</h2>
                  <p className="mt-1 text-sm text-[var(--color-afta-subtle)]">
                    Verifies Firestore reads, analytics, Firebase config, and static assets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRunSmokeChecks}
                  disabled={smokeLoading}
                  className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                >
                  {smokeLoading ? "Running…" : "Run smoke checks"}
                </button>
              </div>

              {smokeRanAt ? (
                <p className="mb-4 text-xs text-[var(--color-afta-muted)]">
                  Last run: {smokeRanAt.toLocaleString()} · {smokeSummary.passed} passed ·{" "}
                  {smokeSummary.warnings} warnings · {smokeSummary.failed} failed
                </p>
              ) : null}

              {smokeResults.length === 0 ? (
                <p className="text-sm text-[var(--color-afta-subtle)]">Run smoke checks before pilot go-live.</p>
              ) : (
                <ul className="space-y-2">
                  {smokeResults.map((result) => (
                    <li
                      key={result.id}
                      className={`rounded-[10px] border px-4 py-3 text-sm ${statusClasses(result.status)}`}
                    >
                      <p className="font-semibold">{result.label}</p>
                      <p className="mt-1 text-xs opacity-90">{result.detail}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Manual pilot checklist</h2>
                  <p className="mt-1 text-sm text-[var(--color-afta-subtle)]">
                    {manualComplete} of {PILOT_MANUAL_CHECKS.length} complete (saved in this browser).
                  </p>
                </div>
              </div>
              <ul className="space-y-3">
                {PILOT_MANUAL_CHECKS.map((item) => (
                  <li
                    key={item.id}
                    className="flex gap-3 rounded-[10px] border border-[var(--color-afta-border)] px-4 py-3"
                  >
                    <input
                      id={item.id}
                      type="checkbox"
                      checked={Boolean(manualChecks[item.id])}
                      onChange={() => toggleManualCheck(item.id)}
                      className="mt-1 h-4 w-4 accent-[#c8102e]"
                    />
                    <label htmlFor={item.id} className="min-w-0 flex-1 cursor-pointer">
                      <p className="text-sm font-semibold text-[var(--color-afta-text)]">{item.label}</p>
                      <p className="mt-1 text-xs text-[var(--color-afta-subtle)]">{item.description}</p>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}

        {activeTab === "training" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {PILOT_TRAINING_MODULES.map((module) => (
              <section
                key={module.id}
                className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-afta-muted)]">
                  {module.role}
                </p>
                <h2 className="mt-1 text-sm font-semibold">{module.label}</h2>
                <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-[var(--color-afta-text)]">
                  {module.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        ) : null}

        {activeTab === "deployment" ? (
          <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
            <h2 className="text-sm font-semibold">Deployment steps</h2>
            <p className="mt-1 text-sm text-[var(--color-afta-subtle)]">
              Production URL:{" "}
              <a href={PILOT_HOSTING_URL} className="text-[#c8102e] hover:underline">
                {PILOT_HOSTING_URL}
              </a>
            </p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-[var(--color-afta-text)]">
              {DEPLOY_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className="mt-5 rounded-[10px] border border-[var(--color-afta-border)] bg-white p-4 font-mono text-xs text-[var(--color-afta-subtle)]">
              <p>npm run build</p>
              <p>npm run deploy</p>
              <p>npm run deploy:rules</p>
              <p>npm run pilot:seed</p>
            </div>
          </section>
        ) : null}

        {activeTab === "migration" ? (
          <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
            <h2 className="text-sm font-semibold">Migration and data setup</h2>
            <p className="mt-1 text-sm text-[var(--color-afta-subtle)]">
              Use these notes when onboarding the first pilot departments and academy staff.
            </p>
            <ul className="mt-4 space-y-3 text-sm text-[var(--color-afta-text)]">
              {MIGRATION_NOTES.map((note) => (
                <li key={note} className="rounded-[10px] border border-[var(--color-afta-border)] px-4 py-3">
                  {note}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {activeTab === "ecosystem" ? (
          <ForgeEcosystemOverview variant="full" showCampusNote />
        ) : null}
      </div>
    </>
  );
}
