import { useState } from "react";
import { Plus, ExternalLink, Trash2, Download } from "lucide-react";
import { useCms } from "../../cms/context/CmsContext.jsx";
import { createProgram, PROGRAM_TYPES } from "../../cms/core/programs.js";
import { importBundledProgram } from "../../cms/store/programImport.js";
import { hasBundledContent, listImportablePrograms } from "../../cms/store/programContentSources.js";
import ProgramImportPanel from "../components/ProgramImportPanel.jsx";
import AdminPageHeader, { AdminButton, AdminInput, AdminSelect, AdminTextarea, AdminCard, Toast } from "../components/AdminPageHeader.jsx";

export default function ProgramsPage() {
  const { programs, programId, setProgramId, store, refreshPrograms, refresh } = useCms();
  const [selected, setSelected] = useState(null);
  const [importProgram, setImportProgram] = useState(null);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  const openNew = () => {
    setSelected(createProgram());
  };

  const openEdit = (program) => {
    setSelected({ ...program });
  };

  const updateField = (key, value) => {
    setSelected((prev) => ({ ...prev, [key]: value }));
  };

  const updateDomains = (value) => {
    const domains = value.split("\n").map((d) => d.trim()).filter(Boolean);
    setSelected((prev) => ({ ...prev, domains }));
  };

  const saveProgram = async () => {
    if (!selected?.name?.trim()) {
      setToast("Program name is required");
      return;
    }
    await store.save("programs", {
      ...selected,
      slug: selected.slug || selected.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      updatedAt: new Date().toISOString(),
    });
    await refreshPrograms();
    setToast("Program saved");
    if (!programs.find((p) => p.id === selected.id)) {
      setProgramId(selected.id);
    }
  };

  const importAllBundled = async () => {
    setBusy(true);
    try {
      let total = 0;
      for (const id of listImportablePrograms()) {
        const result = await importBundledProgram(id, true);
        total += result.pagesImported;
      }
      await refresh();
      setToast(`Imported ${total} pages across all programs`);
    } catch (err) {
      setToast(err.message || "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const handleImported = async () => {
    await refresh();
  };

  const deleteProgram = async (program) => {
    if (program.id === "forge-marketing") {
      setToast("Cannot delete the default marketing program");
      return;
    }
    if (!confirm(`Delete "${program.name}"? Content for this program will remain in storage.`)) return;
    await store.remove("programs", program.id);
    await refreshPrograms();
    if (programId === program.id) setProgramId("forge-marketing");
    if (selected?.id === program.id) setSelected(null);
    setToast("Program removed");
  };

  return (
    <div className="p-8">
      <AdminPageHeader
        title="Programs"
        description="Manage every Forge website and application from one control center."
        actions={(
          <div className="flex flex-wrap gap-2">
            <AdminButton variant="secondary" onClick={importAllBundled} disabled={busy}>
              <Download size={16} /> Import all sites
            </AdminButton>
            <AdminButton onClick={openNew}><Plus size={16} /> Add Program</AdminButton>
          </div>
        )}
      />

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {programs.map((p) => (
          <div
            key={p.id}
            className={`rounded-2xl border p-5 cursor-pointer transition-colors hover:border-[#334155] ${
              p.id === programId ? "border-[#F97316]/50 bg-[#F97316]/5" : "border-[#1E293B] bg-[#111827]"
            }`}
            onClick={() => openEdit(p)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color || "#64748B" }} />
                <div className="min-w-0">
                  <h3 className="font-bold text-white truncate">{p.name}</h3>
                  <p className="text-xs text-[#64748B]">{PROGRAM_TYPES[p.type] || p.type}</p>
                </div>
              </div>
              <StatusPill status={p.status} />
            </div>
            <p className="text-sm text-[#94A3B8] mt-3 line-clamp-2">{p.description || "No description"}</p>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setProgramId(p.id); }}
                className="text-xs font-medium text-[#F97316] hover:underline"
              >
                {p.id === programId ? "Currently editing" : "Switch to this program"}
              </button>
              <div className="flex items-center gap-2">
                {(hasBundledContent(p.id) || p.id !== "forge-marketing") && (
                  <button
                    type="button"
                    title="Import site content"
                    onClick={(e) => { e.stopPropagation(); setImportProgram(p); }}
                    className="p-1.5 text-[#64748B] hover:text-[#F97316]"
                  >
                    <Download size={14} />
                  </button>
                )}
                {p.liveUrl && (
                  <a href={p.liveUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="p-1.5 text-[#64748B] hover:text-white">
                    <ExternalLink size={14} />
                  </a>
                )}
                {p.id !== "forge-marketing" && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); deleteProgram(p); }} className="p-1.5 text-red-400 hover:text-red-300">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#1E293B] bg-[#111827] p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-black text-white mb-4">{programs.find((p) => p.id === selected.id) ? "Edit Program" : "New Program"}</h2>
            <div className="space-y-4">
              <AdminInput label="Name" value={selected.name} onChange={(v) => updateField("name", v)} required />
              <AdminInput label="Short Name" value={selected.shortName} onChange={(v) => updateField("shortName", v)} help="Shown in the program switcher" />
              <AdminSelect
                label="Type"
                value={selected.type}
                onChange={(v) => updateField("type", v)}
                options={Object.entries(PROGRAM_TYPES).map(([value, label]) => ({ value, label }))}
              />
              <AdminTextarea label="Description" value={selected.description} onChange={(v) => updateField("description", v)} />
              <AdminInput label="Live URL" value={selected.liveUrl} onChange={(v) => updateField("liveUrl", v)} placeholder="https://..." />
              <AdminInput label="App URL" value={selected.appUrl} onChange={(v) => updateField("appUrl", v)} help="Link to the product admin (e.g. Academy LMS)" />
              <AdminInput label="Brand Color" type="color" value={selected.color || "#64748B"} onChange={(v) => updateField("color", v)} />
              <AdminSelect
                label="Status"
                value={selected.status}
                onChange={(v) => updateField("status", v)}
                options={[{ value: "active", label: "Active" }, { value: "draft", label: "Draft" }]}
              />
              <AdminTextarea
                label="Domains (one per line)"
                value={(selected.domains || []).join("\n")}
                onChange={updateDomains}
                help="Production domains that serve this program's content"
              />
            </div>
            <div className="flex justify-between gap-2 mt-6">
              <AdminButton variant="secondary" onClick={() => setImportProgram(selected)} disabled={busy}>
                <Download size={16} /> Import content
              </AdminButton>
              <div className="flex gap-2">
                <AdminButton variant="ghost" onClick={() => setSelected(null)}>Cancel</AdminButton>
                <AdminButton onClick={saveProgram}>Save Program</AdminButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {importProgram && (
        <ProgramImportPanel
          program={importProgram}
          onClose={() => setImportProgram(null)}
          onImported={handleImported}
        />
      )}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}

function StatusPill({ status }) {
  const colors = { active: "bg-green-500/15 text-green-400", draft: "bg-yellow-500/15 text-yellow-400" };
  return <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${colors[status] || colors.draft}`}>{status}</span>;
}
