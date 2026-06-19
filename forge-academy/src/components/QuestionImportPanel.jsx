import { useState } from "react";
import { Download, Upload } from "lucide-react";
import {
  downloadQuestionImportTemplate,
  mapImportRowsToQuestions,
  parseQuestionUploadFile,
} from "../lib/questionImport.js";
import { bulkCreateTestQuestions } from "../lib/testQuestions.js";

/**
 * @param {{
 *   questionBankId: string,
 *   courseId: string,
 *   resolvePoolId: (poolName: string) => Promise<string>,
 *   userId: string,
 *   onImported: () => void,
 * }} props
 */
export default function QuestionImportPanel({
  questionBankId,
  courseId,
  resolvePoolId,
  userId,
  onImported,
}) {
  const [previewCount, setPreviewCount] = useState(0);
  const [errors, setErrors] = useState([]);
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage("");
    setErrors([]);
    setParsedQuestions([]);

    try {
      const { rows } = await parseQuestionUploadFile(file);
      const { questions, errors: rowErrors } = await mapImportRowsToQuestions(rows, {
        courseId,
        questionBankId,
        resolvePoolId,
      });
      setParsedQuestions(questions);
      setPreviewCount(questions.length);
      setErrors(rowErrors);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Unable to parse upload file."]);
    }
  }

  async function handleImport() {
    if (!parsedQuestions.length) return;
    setImporting(true);
    setMessage("");
    try {
      await bulkCreateTestQuestions(parsedQuestions, userId);
      setMessage(`Imported ${parsedQuestions.length} question${parsedQuestions.length === 1 ? "" : "s"}.`);
      setParsedQuestions([]);
      setPreviewCount(0);
      onImported();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Import failed."]);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4 rounded-[14px] border border-[var(--color-afta-border)] bg-white p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-afta-text)]">Question upload</h3>
          <p className="mt-1 text-xs text-[var(--color-afta-muted)]">Import CSV or Excel files using the sprint column template.</p>
        </div>
        <button
          type="button"
          onClick={downloadQuestionImportTemplate}
          className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--color-afta-border)] px-3 py-2 text-xs font-semibold text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)]"
        >
          <Download className="h-4 w-4" />
          Download template
        </button>
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center rounded-[12px] border border-dashed border-[var(--color-afta-border)] px-4 py-8 text-center">
        <Upload className="h-5 w-5 text-[var(--color-afta-muted)]" />
        <span className="mt-2 text-sm text-[var(--color-afta-text)]">Choose CSV or Excel file</span>
        <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
      </label>

      {previewCount > 0 ? (
        <p className="text-sm text-green-300">{previewCount} question{previewCount === 1 ? "" : "s"} ready to import.</p>
      ) : null}

      {message ? <p className="text-sm text-green-300">{message}</p> : null}

      {errors.length ? (
        <ul className="space-y-1 rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
          {errors.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}

      {parsedQuestions.length ? (
        <button
          type="button"
          disabled={importing}
          onClick={handleImport}
          className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
        >
          {importing ? "Importing…" : `Import ${parsedQuestions.length} questions`}
        </button>
      ) : null}
    </div>
  );
}
