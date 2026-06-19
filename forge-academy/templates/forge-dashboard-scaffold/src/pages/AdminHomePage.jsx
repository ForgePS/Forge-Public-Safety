import { Link } from "react-router-dom";

const SAMPLE_DISPLAY = {
  id: "display-1",
  publicKey: "demo-key-change-me",
  name: "Station 1 — Ops Display",
};

export default function AdminHomePage() {
  const playerPath = `/display/${SAMPLE_DISPLAY.id}/${SAMPLE_DISPLAY.publicKey}`;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <header className="mb-8 border-b border-slate-200 pb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Forge Public Safety</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">ForgePS Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          Org-wide digital signage fed from Forge RMS. Campus training TVs live in Forge Academy.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold">Sample display</h2>
        <p className="mt-2 text-sm text-slate-600">
          Mock RMS widgets rotate on a {12}-second interval. Replace <code className="rounded bg-slate-100 px-1">fetchDisplayPayload</code> with
          your Firebase callable or RMS API client.
        </p>
        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex gap-2">
            <dt className="w-28 font-semibold text-slate-500">Name</dt>
            <dd>{SAMPLE_DISPLAY.name}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 font-semibold text-slate-500">Player URL</dt>
            <dd className="break-all font-mono text-xs">{window.location.origin}{playerPath}</dd>
          </div>
        </dl>
        <Link
          to={playerPath}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-block rounded-lg bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
        >
          Open player (1920×1080)
        </Link>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        <h2 className="font-semibold text-slate-900">Next steps</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>Create a Firebase project for Dashboard (not forge-academy-95f84).</li>
          <li>Copy <code className="rounded bg-white px-1">.firebaserc.example</code> → <code className="rounded bg-white px-1">.firebaserc</code>.</li>
          <li>Implement Firestore collections for displays, layouts, and cached RMS feeds.</li>
          <li>Wire RMS <code className="rounded bg-white px-1">GET /v1/departments/&#123;id&#125;/dashboard-feed</code> per docs/INTEGRATION.md.</li>
        </ol>
      </section>
    </div>
  );
}
