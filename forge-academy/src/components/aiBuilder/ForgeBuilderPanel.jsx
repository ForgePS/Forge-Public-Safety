import { useMemo, useRef, useState } from "react";
import { Sparkles, Upload, X, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  AI_BUILDER_ACCEPT,
  AI_BUILDER_TARGET_LABELS,
  callForgeAiBuild,
  diffObjects,
  logForgeAiBuilderApply,
} from "../../lib/aiBuilder/aiBuilderClient.js";
import { widgetTypeLabel } from "../../lib/digitalDashboard.js";
import { QUESTION_TYPE_LABELS } from "../../lib/testQuestions.js";
import ModuleFormRenderer from "./ModuleFormRenderer.jsx";

/**
 * @param {{
 *   targetType: 'signageLayout' | 'questionBank' | 'testBlueprint',
 *   targetId?: string,
 *   currentState?: Record<string, unknown>,
 *   context?: Record<string, unknown>,
 *   onApply: (output: Record<string, unknown>) => void | Promise<void>,
 *   disabled?: boolean,
 *   className?: string,
 * }} props
 */
export default function ForgeBuilderPanel({
  targetType,
  targetId = "",
  currentState = {},
  context = {},
  onApply,
  disabled = false,
  className = "",
}) {
  const fileInputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState(/** @type {File[]} */ ([]));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [applying, setApplying] = useState(false);

  const label = AI_BUILDER_TARGET_LABELS[targetType] || "AI Builder";

  const previewOutput = result?.ok ? result.output : result?.draft;
  const validationErrors = Array.isArray(result?.errors) ? result.errors : [];

  const diff = useMemo(() => {
    if (!previewOutput) return [];
    return diffObjects(currentState, previewOutput).slice(0, 20);
  }, [currentState, previewOutput]);

  function addFiles(fileList) {
    const next = [...files];
    for (const file of fileList) {
      if (next.length >= 5) break;
      next.push(file);
    }
    setFiles(next);
  }

  async function handleGenerate(event) {
    event.preventDefault();
    if (disabled) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await callForgeAiBuild({
        targetType,
        targetId,
        userPrompt: prompt,
        currentState,
        context,
        attachments: files,
      });
      setResult(data);
      if (!data.ok && data.errors?.length) {
        setError(data.errors.join(" "));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI Builder request failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    if (!previewOutput || disabled) return;
    setApplying(true);
    setError(null);
    try {
      await onApply(/** @type {Record<string, unknown>} */ (previewOutput));
      await logForgeAiBuilderApply({ targetType, targetId, action: "apply" });
      setOpen(false);
      setResult(null);
      setPrompt("");
      setFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to apply changes.");
    } finally {
      setApplying(false);
    }
  }

  function handleDiscard() {
    setResult(null);
    setError(null);
  }

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 rounded-[10px] border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800 hover:bg-violet-100 disabled:opacity-50 ${className}`}
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-4 w-4" />
        AI Builder
      </button>
    );
  }

  return (
    <div className={`rounded-[12px] border border-violet-200 bg-violet-50/50 p-4 ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-violet-900">
            <Sparkles className="h-4 w-4" />
            AI Builder — {label}
          </h4>
          <p className="mt-1 text-xs text-violet-700">
            Upload a mockup, PDF, or spreadsheet and describe what you want. Preview before applying.
          </p>
        </div>
        <button type="button" className="rounded p-1 text-violet-600 hover:bg-violet-100" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <form className="space-y-3" onSubmit={handleGenerate}>
        <label className="block">
          <span className="app-label">Instructions</span>
          <textarea
            className="app-input min-h-[80px]"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              targetType === "signageLayout"
                ? "e.g. Lobby display with announcements, clock, and dining menu"
                : targetType === "questionBank"
                  ? "e.g. Generate 10 multiple-choice questions on fire behavior"
                  : "e.g. 50 questions, 70% pass, 120 minutes"
            }
            disabled={disabled || loading}
          />
        </label>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={AI_BUILDER_ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
          />
          <button
            type="button"
            className="app-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs"
            disabled={disabled || loading || files.length >= 5}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Add file
          </button>
          {files.length ? (
            <ul className="mt-2 space-y-1">
              {files.map((file) => (
                <li key={`${file.name}-${file.size}`} className="flex items-center justify-between text-xs text-violet-800">
                  <span>{file.name}</span>
                  <button
                    type="button"
                    className="text-violet-600 hover:underline"
                    onClick={() => setFiles(files.filter((f) => f !== file))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={disabled || loading} className="app-btn-primary px-4 py-2 text-xs">
            {loading ? "Generating…" : "Generate preview"}
          </button>
          {result ? (
            <button type="button" className="app-btn-secondary px-4 py-2 text-xs" onClick={handleDiscard}>
              Discard preview
            </button>
          ) : null}
        </div>
      </form>

      {error ? (
        <div className="mt-3 flex items-start gap-2 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {result ? (
        <div className="mt-4 space-y-3 rounded-[10px] border border-violet-200 bg-white p-3">
          <div className="flex items-center gap-2 text-xs">
            {result.ok ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="font-semibold text-emerald-700">Valid preview ready</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="font-semibold text-amber-700">Preview has validation issues</span>
              </>
            )}
            <span className="text-[var(--color-afta-muted)]">
              · {String(result.source ?? "unknown")} / {String(result.model ?? "")}
            </span>
          </div>

          {validationErrors.length ? (
            <ul className="list-inside list-disc text-xs text-amber-700">
              {validationErrors.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          ) : null}

          <ForgeBuilderPreview targetType={targetType} output={previewOutput} />

          {diff.length ? (
            <details className="text-xs">
              <summary className="cursor-pointer font-semibold text-[var(--color-afta-text)]">Change summary ({diff.length})</summary>
              <ul className="mt-2 max-h-32 overflow-y-auto space-y-1 text-[var(--color-afta-muted)]">
                {diff.map((change) => (
                  <li key={change.path}>
                    <code>{change.path}</code>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={!result.ok || applying || disabled}
              className="app-btn-primary px-4 py-2 text-xs"
              onClick={handleApply}
            >
              {applying ? "Applying…" : "Approve & apply"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * @param {{ targetType: string, output: unknown }} props
 */
function ForgeBuilderPreview({ targetType, output }) {
  if (!output || typeof output !== "object") {
    return <p className="text-xs text-[var(--color-afta-muted)]">No preview data.</p>;
  }

  if (targetType === "signageLayout") {
    const layout = /** @type {Record<string, unknown>} */ (output);
    const zones = Array.isArray(layout.zones) ? layout.zones : [];
    return (
      <div className="space-y-2 text-xs">
        <p>
          <strong>Name:</strong> {String(layout.name ?? "")} · <strong>Template:</strong> {String(layout.templateId ?? "")}
        </p>
        <ul className="space-y-1">
          {zones.map((zone) => {
            const z = /** @type {Record<string, unknown>} */ (zone);
            return (
              <li key={String(z.id)} className="rounded border border-[var(--color-afta-border)] px-2 py-1">
                {widgetTypeLabel(String(z.widgetType))} — col {Number(z.x) + 1}, row {Number(z.y) + 1}, {z.w}×{z.h}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (targetType === "questionBank") {
    const data = /** @type {Record<string, unknown>} */ (output);
    const questions = Array.isArray(data.questions) ? data.questions : [];
    return (
      <div className="max-h-48 space-y-2 overflow-y-auto text-xs">
        <p className="font-semibold">{questions.length} question(s)</p>
        {questions.slice(0, 8).map((q, index) => {
          const row = /** @type {Record<string, unknown>} */ (q);
          return (
            <div key={index} className="rounded border border-[var(--color-afta-border)] p-2">
              <p className="font-medium">{String(row.questionText ?? "").slice(0, 120)}</p>
              <p className="text-[var(--color-afta-muted)]">
                {QUESTION_TYPE_LABELS[String(row.questionType)] || row.questionType} · {String(row.difficulty ?? "")}
              </p>
            </div>
          );
        })}
        {questions.length > 8 ? <p className="text-[var(--color-afta-muted)]">…and {questions.length - 8} more</p> : null}
      </div>
    );
  }

  if (targetType === "testBlueprint") {
    const bp = /** @type {Record<string, unknown>} */ (output);
    return (
      <div className="space-y-1 text-xs">
        <p><strong>Test:</strong> {String(bp.testName ?? "")}</p>
        <p><strong>Questions:</strong> {String(bp.totalQuestions ?? "")} · <strong>Pass:</strong> {String(bp.passingScore ?? "")}%</p>
        <p><strong>Time limit:</strong> {bp.timeLimitMinutes != null ? `${bp.timeLimitMinutes} min` : "None"}</p>
        {Array.isArray(bp.poolRules) && bp.poolRules.length ? (
          <p><strong>Pool rules:</strong> {bp.poolRules.length}</p>
        ) : null}
      </div>
    );
  }

  if (targetType === "signagePlaylist") {
    const pl = /** @type {Record<string, unknown>} */ (output);
    return (
      <div className="space-y-1 text-xs">
        <p><strong>Playlist:</strong> {String(pl.name ?? "")}</p>
        <p><strong>Items:</strong> {Array.isArray(pl.itemIds) ? pl.itemIds.length : 0} · <strong>Loop:</strong> {pl.loop !== false ? "Yes" : "No"}</p>
        {Array.isArray(pl.suggestedMediaTitles) && pl.suggestedMediaTitles.length ? (
          <ul className="list-inside list-disc text-[var(--color-afta-muted)]">
            {pl.suggestedMediaTitles.map((t) => <li key={String(t)}>{String(t)}</li>)}
          </ul>
        ) : null}
      </div>
    );
  }

  if (targetType === "signageMedia") {
    const m = /** @type {Record<string, unknown>} */ (output);
    return (
      <div className="space-y-1 text-xs">
        <p><strong>Title:</strong> {String(m.title ?? "")}</p>
        <p><strong>Type:</strong> {String(m.type ?? "")} · <strong>Category:</strong> {String(m.category ?? "")}</p>
        <p>{String(m.description ?? "").slice(0, 120)}</p>
      </div>
    );
  }

  if (targetType === "gradingAssist") {
    const g = /** @type {Record<string, unknown>} */ (output);
    return (
      <div className="space-y-1 text-xs">
        <p><strong>Suggested points:</strong> {String(g.pointsAwarded ?? "")}</p>
        <p><strong>Notes:</strong> {String(g.graderNotes ?? "")}</p>
        <p className="text-[var(--color-afta-muted)]">{String(g.rationale ?? "")}</p>
      </div>
    );
  }

  if (targetType === "gradingRubric") {
    const r = /** @type {Record<string, unknown>} */ (output);
    const criteria = Array.isArray(r.criteria) ? r.criteria : [];
    return (
      <div className="space-y-1 text-xs">
        <p className="font-semibold">{String(r.name ?? "Rubric")} · {criteria.length} criteria</p>
        {criteria.map((c) => {
          const row = /** @type {Record<string, unknown>} */ (c);
          return <p key={String(row.id)}>{String(row.label)} — {String(row.maxPoints)} pts</p>;
        })}
      </div>
    );
  }

  if (targetType === "skillTemplate") {
    const s = /** @type {Record<string, unknown>} */ (output);
    const skills = Array.isArray(s.skills) ? s.skills : [];
    return (
      <div className="space-y-1 text-xs">
        <p className="font-semibold">{String(s.name ?? "")} · {skills.length} skills</p>
        <ul className="list-inside list-disc">{skills.slice(0, 8).map((sk, i) => <li key={i}>{String(/** @type {Record<string, unknown>} */ (sk).name)}</li>)}</ul>
      </div>
    );
  }

  if (targetType === "certificateTemplate") {
    const c = /** @type {Record<string, unknown>} */ (output);
    const fields = Array.isArray(c.fields) ? c.fields : [];
    return (
      <div className="space-y-1 text-xs">
        <p className="font-semibold">{String(c.name ?? "")} · {fields.length} fields</p>
        {fields.map((f) => {
          const row = /** @type {Record<string, unknown>} */ (f);
          return <p key={String(row.id)}>{String(row.label)} ({String(row.type)})</p>;
        })}
      </div>
    );
  }

  if (targetType.startsWith("module")) {
    return <ModuleFormRenderer definition={/** @type {Record<string, unknown>} */ (output)} readOnly />;
  }

  return (
    <pre className="max-h-40 overflow-auto rounded bg-slate-100 p-2 text-[10px]">
      {JSON.stringify(output, null, 2)}
    </pre>
  );
}
