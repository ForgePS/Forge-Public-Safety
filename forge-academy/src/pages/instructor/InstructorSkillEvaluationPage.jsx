import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { getClassSession } from "../../lib/classes.js";
import {
  listSkillEvaluationsByClassStudent,
  SKILL_EVALUATION_STATUSES,
  SKILL_EVALUATION_STATUS_LABELS,
  submitSkillEvaluation,
  submitSkillRemediation,
} from "../../lib/skillEvaluations.js";

export default function InstructorSkillEvaluationPage() {
  const { classId, studentId } = useParams();
  const { user } = useAuth();
  const [classSession, setClassSession] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  async function reload() {
    const [session, rows] = await Promise.all([
      getClassSession(classId),
      listSkillEvaluationsByClassStudent(classId, studentId),
    ]);
    setClassSession(session);
    setEvaluations(rows);
    setDrafts(
      Object.fromEntries(
        rows.map((item) => [
          item.id,
          {
            score: String(item.score || ""),
            notes: item.notes || item.remediationNotes || "",
          },
        ]),
      ),
    );
  }

  useEffect(() => {
    if (!classId || !studentId) return;

    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        await reload();
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load skill sheet.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [classId, studentId]);

  async function handleSave(evaluation, mode) {
    if (!user?.uid) return;
    const draft = drafts[evaluation.id] ?? { score: "", notes: "" };
    setSavingId(evaluation.id);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        evaluationId: evaluation.id,
        score: Number(draft.score || 0),
        notes: draft.notes,
        evaluatorUserId: user.uid,
        evaluatorName: user.displayName ?? user.email ?? "",
      };

      if (mode === "remediation") {
        await submitSkillRemediation(payload);
      } else if (mode === "fail") {
        await submitSkillEvaluation({
          ...payload,
          status: SKILL_EVALUATION_STATUSES.FAIL,
        });
      } else {
        await submitSkillEvaluation({
          ...payload,
          status:
            Number(draft.score || 0) >= evaluation.passingScore
              ? SKILL_EVALUATION_STATUSES.PASS
              : SKILL_EVALUATION_STATUSES.REMEDIATE,
        });
      }

      await reload();
      setMessage("Skill evaluation saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save evaluation.");
    } finally {
      setSavingId("");
    }
  }

  const studentName = evaluations[0]?.studentName ?? "Student";

  return (
    <>
      <PageHeader
        title={`Skill Sheet · ${studentName}`}
        subtitle={classSession?.courseName ?? "Digital skills evaluation"}
        actions={
          <Link
            to={`/instructor/skills/${classId}`}
            className="app-btn-secondary px-4 py-2 text-xs"
          >
            Back to class
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-[10px] border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
            {message}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading skill sheet…</p>
        ) : (
          <div className="space-y-4">
            {evaluations.map((evaluation) => {
              const draft = drafts[evaluation.id] ?? { score: "", notes: "" };
              const isRemediation = evaluation.status === SKILL_EVALUATION_STATUSES.REMEDIATE;

              return (
                <article
                  key={evaluation.id}
                  className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-[var(--color-afta-text)]">{evaluation.skillName}</h2>
                      <p className="mt-1 text-sm text-[var(--color-afta-subtle)]">
                        Passing score {evaluation.passingScore} / {evaluation.maxScore}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase text-[var(--color-afta-subtle)]">
                      {SKILL_EVALUATION_STATUS_LABELS[evaluation.status] ?? evaluation.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="block text-sm">
                      <span className="mb-1 block text-[var(--color-afta-subtle)]">Score</span>
                      <input
                        type="number"
                        min="0"
                        max={evaluation.maxScore}
                        value={draft.score}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [evaluation.id]: { ...draft, score: event.target.value },
                          }))
                        }
                        className="w-full rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2 text-[var(--color-afta-text)]"
                      />
                    </label>
                    <label className="block text-sm md:col-span-2">
                      <span className="mb-1 block text-[var(--color-afta-subtle)]">
                        {isRemediation ? "Remediation notes" : "Evaluator notes"}
                      </span>
                      <textarea
                        value={draft.notes}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [evaluation.id]: { ...draft, notes: event.target.value },
                          }))
                        }
                        rows={3}
                        className="w-full rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2 text-[var(--color-afta-text)]"
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {isRemediation ? (
                      <button
                        type="button"
                        disabled={savingId === evaluation.id}
                        onClick={() => handleSave(evaluation, "remediation")}
                        className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                      >
                        Save remediation
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={savingId === evaluation.id}
                          onClick={() => handleSave(evaluation, "evaluate")}
                          className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                        >
                          Save evaluation
                        </button>
                        <button
                          type="button"
                          disabled={savingId === evaluation.id}
                          onClick={() => handleSave(evaluation, "fail")}
                          className="rounded-[10px] border border-[var(--color-afta-border)] px-4 py-2 text-xs font-semibold text-[var(--color-afta-subtle)]"
                        >
                          Mark fail
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
