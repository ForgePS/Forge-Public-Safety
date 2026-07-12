import { useRef, useState } from "react";
import { Download, Upload, FileJson } from "lucide-react";
import {
  getImportOptionsForProgram,
  importBundledProgram,
  importProgramFromFile,
  copyProgramContent,
} from "../../cms/store/programImport.js";
import AdminPageHeader, { AdminButton, AdminCard, Toast } from "./AdminPageHeader.jsx";

export default function ProgramImportPanel({ program, onClose, onImported }) {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const fileRef = useRef(null);

  if (!program) return null;

  const options = getImportOptionsForProgram(program.id);

  const runImport = async (fn) => {
    setBusy(true);
    try {
      const result = await fn();
      setToast(`Imported ${result.pagesImported} pages for ${program.name}`);
      onImported?.(result);
    } catch (err) {
      setToast(err.message || "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const handleBundled = () => runImport(() => importBundledProgram(program.id, true));

  const handleCopyMarketing = () => runImport(() => copyProgramContent(program.id, "forge-marketing", true));

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await runImport(() => importProgramFromFile(program.id, file, true));
    event.target.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-[#1E293B] bg-[#111827] p-6 max-h-[90vh] overflow-y-auto">
        <AdminPageHeader
          title={`Import content — ${program.name}`}
          description="Pull existing website information into this program. This replaces current pages, branding, navigation, and settings for this program only."
        />

        <div className="mt-6 space-y-4">
          {options.map((option) => {
            if (option.id === "bundled") {
              return (
                <AdminCard key={option.id} title={option.label}>
                  <p className="text-sm text-[#94A3B8] mb-4">{option.description}</p>
                  <AdminButton onClick={handleBundled} disabled={busy}>
                    <Download size={16} /> Import bundled content
                  </AdminButton>
                </AdminCard>
              );
            }
            if (option.id === "copy-marketing") {
              return (
                <AdminCard key={option.id} title={option.label}>
                  <p className="text-sm text-[#94A3B8] mb-4">{option.description}</p>
                  <AdminButton variant="secondary" onClick={handleCopyMarketing} disabled={busy}>
                    <Download size={16} /> Copy from Forge Public Safety
                  </AdminButton>
                </AdminCard>
              );
            }
            if (option.id === "json") {
              return (
                <AdminCard key={option.id} title={option.label}>
                  <p className="text-sm text-[#94A3B8] mb-4">{option.description}</p>
                  <p className="text-xs text-[#64748B] mb-3">
                    Supports a single merged JSON file with keys like <code className="text-[#94A3B8]">global</code>,{" "}
                    <code className="text-[#94A3B8]">home</code>, <code className="text-[#94A3B8]">footer</code>, or a full CMS export with a <code className="text-[#94A3B8]">pages</code> array.
                  </p>
                  <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFile} />
                  <AdminButton variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
                    <Upload size={16} /> Choose JSON file
                  </AdminButton>
                </AdminCard>
              );
            }
            return null;
          })}
        </div>

        <div className="mt-6 rounded-xl border border-[#1E293B] bg-[#0B1220] p-4">
          <div className="flex items-start gap-3">
            <FileJson size={18} className="text-[#64748B] shrink-0 mt-0.5" />
            <div className="text-sm text-[#94A3B8]">
              <p className="font-medium text-white mb-1">Where content comes from</p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li><strong className="text-white">Forge Public Safety</strong> — already loaded from <code className="text-[#94A3B8]">content/*.json</code></li>
                <li><strong className="text-white">RMS, Academy, Industrial Safety</strong> — bundled copy in <code className="text-[#94A3B8]">content/programs/</code></li>
                <li><strong className="text-white">Your own sites</strong> — export JSON from your repo or upload a CMS backup</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <AdminButton variant="ghost" onClick={onClose} disabled={busy}>Close</AdminButton>
        </div>
        <Toast message={toast} onClose={() => setToast("")} />
      </div>
    </div>
  );
}
