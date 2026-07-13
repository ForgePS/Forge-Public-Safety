import { useId, useRef, useState } from "react";
import { Download, Upload, FileJson, Save } from "lucide-react";
import {
  getImportOptionsForProgram,
  importBundledProgram,
  importProgramFromFiles,
  copyProgramContent,
  downloadProgramExport,
} from "../../cms/store/programImport.js";
import { mergeUploadedContentFiles, parseJsonText, analyzeMergedUpload } from "../../cms/store/contentBuilders.js";
import AdminPageHeader, { AdminButton, AdminCard, Toast } from "./AdminPageHeader.jsx";

export default function ProgramImportPanel({ program, onClose, onImported }) {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success");
  const [dragOver, setDragOver] = useState(false);
  const [pending, setPending] = useState(null);
  const backupInputId = useId();
  const contentInputId = useId();
  const backupRef = useRef(null);
  const contentRef = useRef(null);

  if (!program) return null;

  const options = getImportOptionsForProgram(program.id);

  const showToast = (message, type = "success") => {
    setToastType(type);
    setToast(message);
  };

  const runImport = async (fn) => {
    setBusy(true);
    try {
      const result = await fn();
      let message = `Imported ${result.pagesImported} pages for ${program.name}`;
      if (result.rebuiltFromContent) {
        message += " — rebuilt pages from content copy files";
      } else if (result.importMode === "cms-backup") {
        message += " — restored your uploaded CMS pages";
        if (result.importedPageTitles?.length) {
          message += `: ${result.importedPageTitles.slice(0, 5).join(", ")}${result.importedPageTitles.length > 5 ? "…" : ""}`;
        }
      }
      showToast(message, "success");
      setPending(null);
      onImported?.(result);
      return result;
    } catch (err) {
      console.error("Import failed:", err);
      showToast(err.message || "Import failed", "error");
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const handleBundled = () => runImport(() => importBundledProgram(program.id, true)).catch(() => {});

  const handleCopyMarketing = () => runImport(() => copyProgramContent(program.id, "forge-marketing", true)).catch(() => {});

  const handleExport = async () => {
    setBusy(true);
    try {
      await downloadProgramExport(program.id, program.name);
      showToast(`Exported backup for ${program.name}`, "success");
    } catch (err) {
      showToast(err.message || "Export failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const stageFiles = async (fileList, mode) => {
    const list = Array.from(fileList || []).filter((f) => {
      const name = (f.name || "").toLowerCase();
      return name.endsWith(".json") || f.type === "application/json" || f.type === "text/json";
    });
    if (!list.length) {
      showToast("Please choose one or more .json files.", "error");
      setPending(null);
      return;
    }

    try {
      const fileDataList = [];
      for (const file of list) {
        const text = await file.text();
        const data = parseJsonText(text);
        fileDataList.push({ name: file.name, data, file });
      }
      const merged = mergeUploadedContentFiles(fileDataList.map(({ name, data }) => ({ name, data })));
      const analysis = analyzeMergedUpload(merged);

      if (mode === "backup" && analysis.format === "content-copy") {
        showToast(
          "These look like content copy files (global.json / home.json). Use “Import content copy files” below, or export a CMS backup from this panel first.",
          "error"
        );
      }
      if (mode === "content" && analysis.format === "cms-backup") {
        showToast(
          "These look like a CMS backup with page sections. You can still import them here, or use “Import CMS backup” above.",
          "success"
        );
      }
      if (analysis.format === "unknown") {
        showToast(
          "Unrecognized JSON. Upload a CMS backup (pages with sections) or content files including global.json.",
          "error"
        );
      }

      setPending({
        mode,
        files: fileDataList.map(({ file }) => file),
        fileNames: list.map((f) => f.name),
        analysis,
      });
    } catch (err) {
      console.error("Failed to read import files:", err);
      showToast(err.message || "Could not read the selected JSON files.", "error");
      setPending(null);
    }
  };

  const confirmPendingImport = async () => {
    if (!pending?.files?.length) return;
    const contentRebuild = pending.mode === "content";
    try {
      await runImport(() => importProgramFromFiles(program.id, pending.files, true, { contentRebuild }));
    } catch {
      /* toast already shown */
    }
  };

  const handleBackupInput = async (event) => {
    await stageFiles(event.target.files, "backup");
    event.target.value = "";
  };

  const handleContentInput = async (event) => {
    await stageFiles(event.target.files, "content");
    event.target.value = "";
  };

  const handleDrop = async (event, mode) => {
    event.preventDefault();
    setDragOver(false);
    await stageFiles(event.dataTransfer.files, mode);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-2xl border border-[#1E293B] bg-[#111827] p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <AdminPageHeader
          title={`Import / Export — ${program.name}`}
          description="CMS backup files restore your exact pages. Content copy files (global.json, home.json) rebuild the template site."
        />

        <div className="mt-6">
          <AdminCard title="Export CMS backup (for custom pages)">
            <p className="text-sm text-[#94A3B8] mb-4">
              Export first if you have custom pages edited in the page builder. Re-import that single backup file to restore them exactly.
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
                    onDrop={(e) => handleDrop(e, "backup")}
                  >
                    <FileJson size={28} className="mx-auto text-[#64748B] mb-3" />
                    <p className="text-sm text-white font-medium mb-1">Drop CMS backup JSON here</p>
                    <p className="text-xs text-[#64748B] mb-4">
                      Must contain page objects with <code className="text-[#94A3B8]">sections</code> — not content/*.json copy files
                    </p>
                    <label
                      htmlFor={backupInputId}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors cursor-pointer ${
                        busy ? "opacity-50 pointer-events-none" : "bg-[#F97316] hover:bg-[#ea580c] text-white"
                      }`}
                    >
                      <Upload size={16} /> Choose CMS backup file(s)
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
                  <div
                    className="rounded-xl border border-[#1E293B] bg-[#0B1220] p-4"
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => handleDrop(e, "content")}
                  >
                    <label
                      htmlFor={contentInputId}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors cursor-pointer ${
                        busy ? "opacity-50 pointer-events-none" : "bg-[#1E293B] hover:bg-[#334155] text-white"
                      }`}
                    >
                      <Upload size={16} /> Choose content copy files
                    </label>
                    <p className="text-xs text-[#64748B] mt-3">
                      Select all at once: global.json, home.json, footer.json, etc.
                    </p>
                  </div>
                </AdminCard>
              );
            }
            return null;
          })}
        </div>

        {pending && (
          <div className="mt-4 rounded-xl border border-[#F97316]/40 bg-[#0B1220] p-4 text-sm">
            <p className="text-white font-medium mb-2">Ready to import</p>
            <p className="text-[#94A3B8] mb-2">Files: {pending.fileNames.join(", ")}</p>
            <p className="text-[#94A3B8] mb-4">
              Format: <strong className="text-white">{pending.analysis.format}</strong>
              {" · "}
              Pages: <strong className="text-white">{pending.analysis.pageCount}</strong>
              {pending.analysis.pageTitles?.length > 0 && (
                <> — {pending.analysis.pageTitles.join(", ")}</>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <AdminButton onClick={confirmPendingImport} disabled={busy || pending.analysis.format === "unknown"}>
                <Upload size={16} /> {busy ? "Importing…" : "Confirm import"}
              </AdminButton>
              <AdminButton variant="ghost" onClick={() => setPending(null)} disabled={busy}>
                Clear
              </AdminButton>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <AdminButton variant="ghost" onClick={onClose} disabled={busy}>Close</AdminButton>
        </div>
        <Toast message={toast} type={toastType} onClose={() => setToast("")} />
      </div>
    </div>
  );
}
