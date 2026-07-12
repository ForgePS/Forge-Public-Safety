import { Link } from "react-router-dom";
import { FileText, Plus, Layers, ExternalLink, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useCms } from "../../cms/context/CmsContext.jsx";
import { DEFAULT_PROGRAM_ID, PROGRAM_TYPES } from "../../cms/core/programs.js";
import { restoreProgramWebsite } from "../../cms/store/programImport.js";
import AdminPageHeader, { AdminButton } from "../components/AdminPageHeader.jsx";

export default function DashboardPage() {
  const { pages, forms, settings, programs, program, programId, setProgramId, loading, switchingProgram, refresh } = useCms();
  const [restoring, setRestoring] = useState(false);

  if (loading) return <div className="p-8 text-[#64748B]">Loading dashboard...</div>;

  const published = pages.filter((p) => p.status === "published").length;
  const drafts = pages.filter((p) => p.status === "draft").length;
  const recent = [...pages].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)).slice(0, 5);

  const restoreWebsite = async () => {
    setRestoring(true);
    try {
      await restoreProgramWebsite(programId);
      await refresh();
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="p-8">
      <AdminPageHeader
        title="Control Center"
        description={`Managing ${program?.name || "your program"}. Switch programs from the sidebar to edit another site.`}
      />

      {pages.length === 0 && (
        <div className="mt-6 rounded-xl border border-[#F97316]/30 bg-[#F97316]/10 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-[#F97316] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-white font-medium">No pages found for {program?.name}</p>
              <p className="text-sm text-[#94A3B8] mt-1 mb-4">
                {programId === DEFAULT_PROGRAM_ID
                  ? "Your Forge Public Safety website content is missing for this program. Restore it below, or switch programs if you were editing the wrong site."
                  : "This program has no pages yet. Switch to Forge Public Safety for your main marketing website, or restore default content for this program."}
              </p>
              <div className="flex flex-wrap gap-2">
                <AdminButton onClick={restoreWebsite} disabled={restoring}>
                  {restoring ? "Restoring..." : "Restore website"}
                </AdminButton>
                {programId !== DEFAULT_PROGRAM_ID && (
                  <AdminButton variant="secondary" onClick={() => setProgramId(DEFAULT_PROGRAM_ID)}>
                    Switch to Forge Public Safety
                  </AdminButton>
                )}
                <Link to="/admin/programs" className="inline-flex items-center rounded-full px-4 py-2 text-sm font-bold text-[#94A3B8] hover:text-white hover:bg-white/5">
                  Import / Export
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {programId !== DEFAULT_PROGRAM_ID && pages.length > 0 && (
        <div className="mt-6 rounded-xl border border-[#1E293B] bg-[#111827] p-4 text-sm text-[#94A3B8]">
          Editing <strong className="text-white">{program?.name}</strong> — not your main marketing site.{" "}
          <button type="button" onClick={() => setProgramId(DEFAULT_PROGRAM_ID)} className="text-[#F97316] font-medium hover:underline">
            Switch to Forge Public Safety
          </button>
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers size={20} className="text-[#F97316]" /> All Programs
          </h2>
          <Link to="/admin/programs" className="text-sm text-[#F97316] hover:underline">Manage programs</Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {programs.map((p) => (
            <ProgramCard
              key={p.id}
              program={p}
              active={p.id === programId}
              onSelect={() => setProgramId(p.id)}
              disabled={switchingProgram}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-8">
        <StatCard label="Pages" value={pages.length} sub={`${program?.shortName || "This program"}`} />
        <StatCard label="Published" value={published} />
        <StatCard label="Drafts" value={drafts} />
        <StatCard label="Forms" value={forms.length} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#1E293B] bg-[#111827] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Recent Pages — {program?.shortName}</h2>
            <Link to="/admin/pages" className="text-sm text-[#F97316] hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {recent.map((page) => (
              <Link key={page.id} to={`/admin/pages/${page.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-[#64748B]" />
                  <div>
                    <p className="text-sm font-medium text-white">{page.title}</p>
                    <p className="text-xs text-[#64748B]">/{page.slug}</p>
                  </div>
                </div>
                <StatusBadge status={page.status} />
              </Link>
            ))}
            {recent.length === 0 && (
              <p className="text-sm text-[#64748B] py-4 text-center">No pages for this program yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#1E293B] bg-[#111827] p-6">
          <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid gap-3">
            <Link to="/admin/pages" className="flex items-center gap-3 p-4 rounded-xl border border-[#1E293B] hover:border-[#F97316]/50 transition-colors">
              <Plus size={20} className="text-[#F97316]" />
              <div>
                <p className="text-sm font-bold text-white">Create New Page</p>
                <p className="text-xs text-[#64748B]">For {program?.name}</p>
              </div>
            </Link>
            <Link to="/admin/branding" className="flex items-center gap-3 p-4 rounded-xl border border-[#1E293B] hover:border-[#F97316]/50 transition-colors">
              <Plus size={20} className="text-[#F97316]" />
              <div>
                <p className="text-sm font-bold text-white">Update Branding</p>
                <p className="text-xs text-[#64748B]">Colors, fonts, logos for {program?.shortName}</p>
              </div>
            </Link>
            {program?.appUrl && (
              <a href={program.appUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 rounded-xl border border-[#1E293B] hover:border-[#F97316]/50 transition-colors">
                <ExternalLink size={20} className="text-[#F97316]" />
                <div>
                  <p className="text-sm font-bold text-white">Open {program.shortName} App Admin</p>
                  <p className="text-xs text-[#64748B]">Product-specific admin (LMS, RMS, etc.)</p>
                </div>
              </a>
            )}
          </div>
        </div>
      </div>

      {settings?.maintenance?.enabled && (
        <div className="mt-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-200 text-sm">
          Maintenance mode is enabled for {program?.name}. Public visitors see the maintenance page.
        </div>
      )}
    </div>
  );
}

function ProgramCard({ program, active, onSelect, disabled }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`rounded-xl border p-4 text-left transition-colors hover:border-[#334155] disabled:opacity-60 disabled:cursor-wait ${
        active ? "border-[#F97316]/50 bg-[#F97316]/5" : "border-[#1E293B] bg-[#111827]"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: program.color || "#64748B" }} />
        <span className="text-sm font-bold text-white truncate">{program.shortName || program.name}</span>
      </div>
      <p className="text-xs text-[#64748B] line-clamp-1">{PROGRAM_TYPES[program.type] || program.type}</p>
      {active && <p className="text-[10px] text-[#F97316] font-semibold mt-2 uppercase tracking-wide">Editing now</p>}
    </button>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-[#1E293B] bg-[#111827] p-6">
      <p className="text-sm text-[#64748B]">{label}</p>
      <p className="text-3xl font-black text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-[#64748B] mt-1">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = { published: "bg-green-500/15 text-green-400", draft: "bg-yellow-500/15 text-yellow-400", scheduled: "bg-blue-500/15 text-blue-400", archived: "bg-gray-500/15 text-gray-400" };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] || colors.draft}`}>{status}</span>;
}
