import { useId, useRef, useState } from "react";
import { Download, Upload, FileJson, Save } from "lucide-react";
import {
  getImportOptionsForProgram,
  importBundledProgram,
  importProgramFromFiles,
  copyProgramContent,
  downloadProgramExport,
} from "../../cms/store/programImport.js";
import AdminPageHeader, { AdminButton, AdminCard, Toast } from "./AdminPageHeader.jsx";

export default function ProgramImportPanel({ program, onClose, onImported }) {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const backupInputId = useId();
  const contentInputId = useId();
  const backupRef = useRef(null);
  const contentRef = useRef(null);

  if (!program) return null;

  const options = getImportOptionsForProgram(program.id);

  const runImport = async (fn) => {
    setBusy(true);
    try {
      const result = await fn();
      const modeNote = result.rebuiltFromContent
        ? " (rebuilt 9 pages from content copy files)"
        : result.importMode === "cms-backup"
          ? " (restored from CMS backup)"
          : "";
      setToast(`Imported ${result.pagesImported} pages for ${program.name}${modeNote}`);
      onImported?.(result);
    } catch (err) {
      setToast(err.message || "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const handleBundled = () => runImport(() => importBundledProgram(program.id, true));

  const handleCopyMarketing = () => runImport(() => copyProgramContent(program.id, "forge-marketing", true));

  const handleExport = async () => {
    setBusy(true);
    try {
      await downloadProgramExport(program.id, program.name);
      setToast(`Exported backup for ${program.name}`);
    } catch (err) {
      setToast(err.message || "Export failed");
    } finally {
      setBusy(false);
    }
  };

  const importFiles = async (files, contentRebuild = false) => {
    const list = Array.from(files || []).filter((f) => f.name?.toLowerCase().endsWith(".json"));
    if (!list.length) {
      setToast("Please choose one or more .json files.");
      return;
    }
    await runImport(() => importProgramFromFiles(program.id, list, true, { contentRebuild }));
  };

  const handleBackupInput = async (event) => {
    await importFiles(event.target.files, false);
    event.target.value = "";
  };

  const handleContentInput = async (event) => {
    await importFiles(event.target.files, true);
    event.target.value = "";
  };

  const handleDrop = async (event, contentRebuild = false) => {
    event.preventDefault();
    setDragOver(false);
    await importFiles(event.dataTransfer.files, contentRebuild);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-2xl border border-[#1E293B] bg-[#111827] p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <AdminPageHeader
          title={`Import / Export — ${program.name}`}
          description="Export saves your exact CMS pages. Import that backup to restore edits. Content copy files only rebuild the default 9-page template from marketing text."
        />

        <div className="mt-6">
          <AdminCard title="Export CMS backup (do this first)">
            <p className="text-sm text-[#94A3B8] mb-4">
              Download a JSON backup of this program&apos;s pages, branding, navigation, and settings.
              Re-import this file to restore your exact site — including custom edits made in the page builder.
            </p>
            <AdminButton variant="secondary" onClick={handleExport} disabled={busy}>
              <Save size={16} /> Export backup JSON
            </AdminButton>
          </AdminCard>
        </div>

        <div className="mt-4 space-y-4">
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
                  <input
                    id={backupInputId}
                    ref={backupRef}
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={handleBackupInput}
                  />
                  <div
                    className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                      dragOver ? "border-[#F97316] bg-[#F97316]/5" : "border-[#334155] bg-[#0B1220]"
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => handleDrop(e, false)}
                  >
                    <FileJson size={28} className="mx-auto text-[#64748B] mb-3" />
                    <p className="text-sm text-white font-medium mb-1">Drop CMS backup JSON here</p>
                    <p className="text-xs text-[#64748B] mb-4">Use a file exported from this screen, or a full CMS store backup</p>
                    <label
                      htmlFor={backupInputId}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors cursor-pointer ${
                        busy ? "opacity-50 pointer-events-none" : "bg-[#F97316] hover:bg-[#ea580c] text-white"
                      }`}
                    >
                      <Upload size={16} /> Choose backup file
                    </label>
                  </div>
                </AdminCard>
              );
            }
            if (option.id === "json-content") {
              return (
                <AdminCard key={option.id} title={option.label}>
                  <p className="text-sm text-[#94A3B8] mb-4">{option.description}</p>
                  <input
                    id={contentInputId}
                    ref={contentRef}
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={handleContentInput}
                  />
                  <label
                    htmlFor={contentInputId}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors cursor-pointer ${
                      busy ? "opacity-50 pointer-events-none" : "bg-[#1E293B] hover:bg-[#334155] text-white"
                    }`}
                  >
                    <Upload size={16} /> Choose content copy files
                  </label>
                </AdminCard>
              );
            }
            return null;
          })}
        </div>

        <div className="flex justify-end mt-6">
          <AdminButton variant="ghost" onClick={onClose} disabled={busy}>Close</AdminButton>
        </div>
        <Toast message={toast} onClose={() => setToast("")} />
      </div>
    </div>
  );
}
