import { useId, useRef, useState } from "react";
import { Download, Upload, FileJson } from "lucide-react";
import {
  getImportOptionsForProgram,
  importBundledProgram,
  importProgramFromFiles,
  copyProgramContent,
} from "../../cms/store/programImport.js";
import AdminPageHeader, { AdminButton, AdminCard, Toast } from "./AdminPageHeader.jsx";

export default function ProgramImportPanel({ program, onClose, onImported }) {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputId = useId();
  const fileRef = useRef(null);

  if (!program) return null;

  const options = getImportOptionsForProgram(program.id);

  const runImport = async (fn) => {
    setBusy(true);
    try {
      const result = await fn();
      setToast(`Imported ${result.pagesImported} pages for ${program.name}`);
      setSelectedFiles([]);
      onImported?.(result);
    } catch (err) {
      setToast(err.message || "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const handleBundled = () => runImport(() => importBundledProgram(program.id, true));

  const handleCopyMarketing = () => runImport(() => copyProgramContent(program.id, "forge-marketing", true));

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.name?.toLowerCase().endsWith(".json"));
    if (!files.length) {
      setToast("Please choose one or more .json files.");
      return;
    }
    setSelectedFiles(files);
  };

  const handleFileInput = (event) => {
    handleFiles(event.target.files);
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    handleFiles(event.dataTransfer.files);
  };

  const handleUploadSelected = () => {
    if (!selectedFiles.length) {
      fileRef.current?.click();
      return;
    }
    runImport(() => importProgramFromFiles(program.id, selectedFiles, true));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-2xl border border-[#1E293B] bg-[#111827] p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
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
                    You can select <strong className="text-white">multiple files at once</strong> from your{" "}
                    <code className="text-[#94A3B8]">content/</code> folder (global.json, home.json, footer.json, etc.),
                    or one merged JSON file with a <code className="text-[#94A3B8]">pages</code> array.
                  </p>

                  <input
                    id={fileInputId}
                    ref={fileRef}
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={handleFileInput}
                  />

                  <div
                    className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                      dragOver ? "border-[#F97316] bg-[#F97316]/5" : "border-[#334155] bg-[#0B1220]"
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                  >
                    <FileJson size={28} className="mx-auto text-[#64748B] mb-3" />
                    <p className="text-sm text-white font-medium mb-1">Drop JSON files here</p>
                    <p className="text-xs text-[#64748B] mb-4">or click below to browse</p>
                    <label
                      htmlFor={fileInputId}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors cursor-pointer ${
                        busy ? "opacity-50 pointer-events-none" : "bg-[#1E293B] hover:bg-[#334155] text-white"
                      }`}
                    >
                      <Upload size={16} /> Choose JSON files
                    </label>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="mt-3 rounded-lg border border-[#1E293B] bg-[#0B1220] p-3">
                      <p className="text-xs font-medium text-white mb-2">{selectedFiles.length} file(s) selected:</p>
                      <ul className="text-xs text-[#94A3B8] space-y-1 max-h-24 overflow-y-auto">
                        {selectedFiles.map((file) => (
                          <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <AdminButton variant="secondary" onClick={handleUploadSelected} disabled={busy}>
                      <Upload size={16} /> {selectedFiles.length ? "Import selected files" : "Choose files to import"}
                    </AdminButton>
                    {selectedFiles.length > 0 && (
                      <AdminButton variant="ghost" onClick={() => setSelectedFiles([])} disabled={busy}>
                        Clear
                      </AdminButton>
                    )}
                  </div>
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
              <p className="font-medium text-white mb-1">Tip for Windows</p>
              <p className="text-xs">
                In the file picker, set the filter to <strong className="text-white">All files (*.*)</strong> if .json
                files appear greyed out. You must include <code className="text-[#94A3B8]">global.json</code> when
                uploading separate content files.
              </p>
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
