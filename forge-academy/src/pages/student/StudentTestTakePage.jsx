import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import {
  ONLINE_ATTEMPT_STATUSES,
  saveTestAnswers,
  startTestSession,
  submitTestAttempt,
  subscribeToTestAttempt,
} from "../../lib/onlineTesting.js";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase.js";

function formatTime(seconds) {
  if (seconds == null) return "No limit";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function StudentTestTakePage() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [attemptId, setAttemptId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [attemptStatus, setAttemptStatus] = useState("");
  const [saveState, setSaveState] = useState("saved");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const timerRef = useRef(null);
  const saveTimerRef = useRef(null);

  const currentQuestion = questions[currentIndex] ?? null;
  const answeredCount = useMemo(
    () =>
      questions.filter((question) => {
        const answer = answers[question.id];
        if (!answer) return false;
        if (question.questionType === "short_answer" || question.questionType === "scenario") {
          return Boolean(answer.shortAnswerText?.trim());
        }
        return (answer.selectedOptionIds ?? []).length > 0;
      }).length,
    [answers, questions],
  );

  const persistAnswers = useCallback(async () => {
    if (!attemptId || attemptStatus === ONLINE_ATTEMPT_STATUSES.SUBMITTED) return;
    setSaveState("saving");
    try {
      await saveTestAnswers({
        attemptId,
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId,
          selectedOptionIds: answer.selectedOptionIds ?? [],
          shortAnswerText: answer.shortAnswerText ?? "",
        })),
        flaggedQuestionIds: [...flagged],
        timeRemainingSeconds: timeRemaining,
      });
      setSaveState("saved");
    } catch (err) {
      setSaveState("error");
      setError(err instanceof Error ? err.message : "Auto-save failed.");
    }
  }, [answers, attemptId, attemptStatus, flagged, timeRemaining]);

  useEffect(() => {
    let active = true;

    async function boot() {
      setLoading(true);
      setError(null);
      try {
        const assignmentSnap = await getDoc(doc(db, "testAssignments", assignmentId));
        if (!assignmentSnap.exists()) throw new Error("Assignment not found.");
        if (!active) return;
        setAssignment({ id: assignmentSnap.id, ...assignmentSnap.data() });

        let deviceId = window.localStorage.getItem("forgeDeviceId");
        if (!deviceId) {
          deviceId = crypto.randomUUID();
          window.localStorage.setItem("forgeDeviceId", deviceId);
        }

        const session = await startTestSession(assignmentId, {
          deviceId,
          userAgent: navigator.userAgent,
        });

        setAttemptId(session.attemptId);
        setSessionId(session.sessionId);
        setQuestions(session.questions ?? []);
        setTimeRemaining(session.timeRemainingSeconds ?? null);
        setAttemptStatus(
          session.status === "paused" ? ONLINE_ATTEMPT_STATUSES.PAUSED : ONLINE_ATTEMPT_STATUSES.IN_PROGRESS,
        );

        if (session.answers?.length) {
          const restored = {};
          for (const answer of session.answers) {
            restored[answer.questionId] = {
              selectedOptionIds: answer.selectedOptionIds ?? [],
              shortAnswerText: answer.shortAnswerText ?? "",
            };
          }
          setAnswers(restored);
        }
        if (session.flaggedQuestionIds?.length) {
          setFlagged(new Set(session.flaggedQuestionIds));
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to start test session.");
      } finally {
        if (active) setLoading(false);
      }
    }

    boot();
    return () => {
      active = false;
    };
  }, [assignmentId]);

  useEffect(() => {
    if (!attemptId) return undefined;
    return subscribeToTestAttempt(attemptId, (attempt) => {
      if (!attempt) return;
      setAttemptStatus(attempt.status ?? "");
      if (attempt.timeRemainingSeconds != null) setTimeRemaining(attempt.timeRemainingSeconds);
      if (attempt.status === ONLINE_ATTEMPT_STATUSES.PAUSED) {
        setError("Your session has been paused by a proctor.");
      }
      if (attempt.resultSummary) setResult(attempt.resultSummary);
    });
  }, [attemptId]);

  useEffect(() => {
    if (timeRemaining == null || attemptStatus === ONLINE_ATTEMPT_STATUSES.SUBMITTED) return undefined;
    timerRef.current = window.setInterval(() => {
      setTimeRemaining((value) => {
        if (value == null) return value;
        if (value <= 1) {
          window.clearInterval(timerRef.current);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timerRef.current);
  }, [attemptStatus, timeRemaining == null]);

  useEffect(() => {
    if (!attemptId || attemptStatus === ONLINE_ATTEMPT_STATUSES.SUBMITTED) return undefined;
    saveTimerRef.current = window.setInterval(() => {
      persistAnswers();
    }, 15000);
    return () => window.clearInterval(saveTimerRef.current);
  }, [attemptId, attemptStatus, persistAnswers]);

  function setAnswerForQuestion(questionId, patch) {
    setAnswers((current) => ({
      ...current,
      [questionId]: { ...(current[questionId] ?? {}), ...patch },
    }));
    setSaveState("unsaved");
  }

  function toggleFlag(questionId) {
    setFlagged((current) => {
      const next = new Set(current);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
    setSaveState("unsaved");
  }

  function toggleOption(question, optionId) {
    const existing = answers[question.id]?.selectedOptionIds ?? [];
    if (question.questionType === "multiple_select") {
      const next = existing.includes(optionId)
        ? existing.filter((id) => id !== optionId)
        : [...existing, optionId];
      setAnswerForQuestion(question.id, { selectedOptionIds: next });
      return;
    }
    setAnswerForQuestion(question.id, { selectedOptionIds: [optionId] });
  }

  async function handleSubmit() {
    if (!window.confirm("Submit your test? You will not be able to change answers afterward.")) return;
    setSubmitting(true);
    setError(null);
    try {
      await persistAnswers();
      const response = await submitTestAttempt(attemptId);
      setResult(response.result ?? null);
      setAttemptStatus(ONLINE_ATTEMPT_STATUSES.SUBMITTED);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit test.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-7">
        <p className="text-sm text-[var(--color-afta-subtle)]">Starting secure test session…</p>
      </div>
    );
  }

  if (result || attemptStatus === ONLINE_ATTEMPT_STATUSES.SUBMITTED) {
    const showSummary = result?.showSummary !== false;
    return (
      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[var(--color-afta-text)]">Test submitted</h2>
          {result && showSummary ? (
            <div className="mt-4 space-y-2 text-sm text-[var(--color-afta-text)]">
              <p>Score: {result.score}/{result.maxScore}</p>
              <p>{result.passed ? "Passed" : "Did not pass"}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--color-afta-subtle)]">Your submission was recorded. Results will be released by your instructor.</p>
          )}
          <button
            type="button"
            onClick={() => navigate("/student/tests")}
            className="mt-6 rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
          >
            Back to assigned tests
          </button>
        </section>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={assignment?.testName || "Online Test"}
        subtitle="Your answers auto-save every 15 seconds"
        actions={
          <div className="flex items-center gap-3 text-xs">
            <span className="rounded-full bg-white px-3 py-1 text-[var(--color-afta-subtle)]">
              {saveState === "saving" ? "Saving…" : saveState === "unsaved" ? "Unsaved changes" : saveState === "error" ? "Save failed" : "Saved"}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-[var(--color-afta-text)]">{formatTime(timeRemaining)}</span>
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
          <aside className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-4">
            <p className="text-xs font-semibold uppercase text-[var(--color-afta-muted)]">Progress</p>
            <p className="mt-2 text-sm text-[var(--color-afta-text)]">
              {answeredCount}/{questions.length} answered
            </p>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {questions.map((question, index) => (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  className={`rounded-[8px] px-2 py-2 text-xs font-semibold ${
                    index === currentIndex
                      ? "bg-[#c8102e] text-white"
                      : flagged.has(question.id)
                        ? "bg-amber-500/20 text-amber-200"
                        : answers[question.id]
                          ? "bg-green-500/15 text-green-300"
                          : "bg-white text-[var(--color-afta-subtle)]"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </aside>

          {currentQuestion ? (
            <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-semibold text-[var(--color-afta-text)]">
                  Question {currentIndex + 1} of {questions.length}
                </p>
                <button
                  type="button"
                  onClick={() => toggleFlag(currentQuestion.id)}
                  className={`text-xs font-semibold ${flagged.has(currentQuestion.id) ? "text-amber-300" : "text-[var(--color-afta-subtle)]"}`}
                >
                  {flagged.has(currentQuestion.id) ? "Flagged" : "Flag for review"}
                </button>
              </div>
              <p className="mt-4 text-sm text-[var(--color-afta-text)]">{currentQuestion.questionText}</p>

              <div className="mt-5 space-y-3">
                {(currentQuestion.answerOptions ?? []).map((option) => {
                  const selected = (answers[currentQuestion.id]?.selectedOptionIds ?? []).includes(option.id);
                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-[10px] border px-4 py-3 ${
                        selected ? "border-[#c8102e]/60 bg-[#c8102e]/10" : "border-[var(--color-afta-border)] bg-white"
                      }`}
                    >
                      <input
                        type={currentQuestion.questionType === "multiple_select" ? "checkbox" : "radio"}
                        name={currentQuestion.id}
                        checked={selected}
                        onChange={() => toggleOption(currentQuestion, option.id)}
                        className="mt-1 accent-[#c8102e]"
                        disabled={attemptStatus === ONLINE_ATTEMPT_STATUSES.PAUSED}
                      />
                      <span className="text-sm text-[var(--color-afta-text)]">{option.text}</span>
                    </label>
                  );
                })}
              </div>

              {currentQuestion.questionType === "short_answer" || currentQuestion.questionType === "scenario" ? (
                <textarea
                  value={answers[currentQuestion.id]?.shortAnswerText ?? ""}
                  onChange={(event) => setAnswerForQuestion(currentQuestion.id, { shortAnswerText: event.target.value })}
                  rows={4}
                  disabled={attemptStatus === ONLINE_ATTEMPT_STATUSES.PAUSED}
                  className="mt-4 w-full rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-afta-text)] outline-none focus:border-[var(--color-afta-red)]/50"
                />
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((value) => value - 1)}
                  className="rounded-[10px] border border-[var(--color-afta-border)] px-4 py-2 text-xs font-semibold text-[var(--color-afta-subtle)] disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentIndex >= questions.length - 1}
                  onClick={() => setCurrentIndex((value) => value + 1)}
                  className="rounded-[10px] border border-[var(--color-afta-border)] px-4 py-2 text-xs font-semibold text-[var(--color-afta-subtle)] disabled:opacity-50"
                >
                  Next
                </button>
                <button
                  type="button"
                  onClick={persistAnswers}
                  className="rounded-[10px] border border-[var(--color-afta-border)] px-4 py-2 text-xs font-semibold text-[var(--color-afta-text)]"
                >
                  Save now
                </button>
                <button
                  type="button"
                  disabled={submitting || attemptStatus === ONLINE_ATTEMPT_STATUSES.PAUSED}
                  onClick={handleSubmit}
                  className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                >
                  {submitting ? "Submitting…" : "Submit test"}
                </button>
              </div>
            </section>
          ) : null}
        </div>

        <p className="text-xs text-[var(--color-afta-muted)]">
          Session {sessionId ? sessionId.slice(0, 8) : "—"} · Attempt {attemptId ? attemptId.slice(0, 8) : "—"}
        </p>
      </div>
    </>
  );
}
