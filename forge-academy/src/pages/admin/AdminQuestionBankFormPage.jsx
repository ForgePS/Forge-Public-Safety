import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import QuestionEditor, { buildQuestionPayload, emptyQuestion } from "../../components/QuestionEditor.jsx";
import QuestionImportPanel from "../../components/QuestionImportPanel.jsx";
import { FormField, FormSection, FormSelect, FormTextarea } from "../../components/StudentFormFields.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { listCourses } from "../../lib/courses.js";
import {
  createQuestionBank,
  getQuestionBank,
  QUESTION_BANK_STATUSES,
  updateQuestionBank,
} from "../../lib/questionBanks.js";
import {
  createQuestionPool,
  findQuestionPoolByName,
  listQuestionPoolsByBank,
  seedDefaultQuestionPools,
} from "../../lib/questionPools.js";
import {
  createTestQuestion,
  deleteTestQuestion,
  listQuestionsByBank,
  QUESTION_TYPE_LABELS,
} from "../../lib/testQuestions.js";

const emptyBank = {
  name: "",
  courseId: "",
  description: "",
  active: true,
};

export default function AdminQuestionBankFormPage() {
  const { bankId } = useParams();
  const isNew = !bankId;
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState(emptyBank);
  const [courses, setCourses] = useState([]);
  const [pools, setPools] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [poolForm, setPoolForm] = useState({ poolName: "", description: "" });
  const [questionForm, setQuestionForm] = useState(emptyQuestion);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const poolNameById = useMemo(
    () => Object.fromEntries(pools.map((pool) => [pool.id, pool.poolName])),
    [pools],
  );

  async function reloadQuestionsAndPools(currentBankId = bankId) {
    if (!currentBankId) return;
    const [poolRows, questionRows] = await Promise.all([
      listQuestionPoolsByBank(currentBankId),
      listQuestionsByBank(currentBankId),
    ]);
    setPools(poolRows);
    setQuestions(questionRows);
  }

  useEffect(() => {
    listCourses().then(setCourses).catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew) return;
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const bank = await getQuestionBank(bankId);
        if (!bank) throw new Error("Question bank not found.");
        if (!active) return;
        setForm({
          name: bank.name,
          courseId: bank.courseId,
          description: bank.description,
          active: bank.active,
        });
        await reloadQuestionsAndPools(bankId);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load question bank.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [bankId, isNew]);

  async function handleSaveBank(event) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    const course = courses.find((item) => item.id === form.courseId);
    const payload = {
      name: form.name,
      bankName: form.name,
      courseId: form.courseId,
      courseName: course?.name ?? "",
      description: form.description,
      active: form.active,
      status: form.active ? QUESTION_BANK_STATUSES.ACTIVE : QUESTION_BANK_STATUSES.INACTIVE,
    };

    try {
      if (isNew) {
        const id = await createQuestionBank(payload, user.uid);
        navigate(`/admin/testing/question-banks/${id}`);
      } else {
        await updateQuestionBank(bankId, payload, user.uid);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save question bank.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddPool(event) {
    event.preventDefault();
    if (!user || isNew) return;
    setSaving(true);
    setError(null);
    try {
      await createQuestionPool(
        {
          questionBankId: bankId,
          courseId: form.courseId,
          poolName: poolForm.poolName,
          description: poolForm.description,
          active: true,
        },
        user.uid,
      );
      setPoolForm({ poolName: "", description: "" });
      await reloadQuestionsAndPools();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create pool.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSeedPools() {
    if (!user || isNew) return;
    setSaving(true);
    try {
      await seedDefaultQuestionPools(bankId, form.courseId, user.uid);
      await reloadQuestionsAndPools();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to seed pools.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddQuestion() {
    if (!user || isNew) return;
    setSaving(true);
    setError(null);
    try {
      await createTestQuestion(buildQuestionPayload(questionForm, bankId, form.courseId), user.uid);
      setQuestionForm(emptyQuestion);
      await reloadQuestionsAndPools();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create question.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteQuestion(questionId) {
    if (!user || !window.confirm("Delete this question?")) return;
    await deleteTestQuestion(questionId, user.uid);
    await reloadQuestionsAndPools();
  }

  async function resolvePoolId(poolName) {
    if (!bankId) throw new Error("Save the bank before importing.");
    const existing = await findQuestionPoolByName(bankId, poolName);
    if (existing) return existing.id;
    return createQuestionPool(
      {
        questionBankId: bankId,
        courseId: form.courseId,
        poolName,
        description: "",
        active: true,
      },
      user?.uid ?? "",
    );
  }

  return (
    <>
      <PageHeader
        title={isNew ? "New Question Bank" : "Question Bank Detail"}
        subtitle="Manage pools, manual entry, and CSV/Excel imports"
        actions={
          <Link to="/admin/testing/question-banks" className="app-btn-secondary px-4 py-2 text-xs">
            Back to banks
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading…</p>
        ) : (
          <>
            <form onSubmit={handleSaveBank} className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
              <FormSection title="Bank details">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Bank name" name="name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
                  <FormSelect label="Course" name="courseId" value={form.courseId} onChange={(e) => setForm((p) => ({ ...p, courseId: e.target.value }))} required>
                    <option value="">Select course…</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>{course.courseNumber} · {course.name}</option>
                    ))}
                  </FormSelect>
                  <FormTextarea label="Description" name="description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
                  <label className="flex items-center gap-2 text-sm text-[var(--color-afta-text)]">
                    <input type="checkbox" checked={form.active} onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} className="accent-[#c8102e]" />
                    Active
                  </label>
                </div>
              </FormSection>
              <button type="submit" disabled={saving} className="mt-4 rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
                {saving ? "Saving…" : isNew ? "Create bank" : "Save bank"}
              </button>
            </form>

            {!isNew ? (
              <>
                <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Question pools</h2>
                    <button type="button" onClick={handleSeedPools} className="rounded-[10px] border border-[var(--color-afta-border)] px-3 py-2 text-xs font-semibold text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)]">
                      Load default pools
                    </button>
                  </div>
                  <form onSubmit={handleAddPool} className="grid gap-4 md:grid-cols-3">
                    <FormField label="Pool name" name="poolName" value={poolForm.poolName} onChange={(e) => setPoolForm((p) => ({ ...p, poolName: e.target.value }))} required />
                    <FormField label="Description" name="description" value={poolForm.description} onChange={(e) => setPoolForm((p) => ({ ...p, description: e.target.value }))} />
                    <div className="flex items-end">
                      <button type="submit" disabled={saving} className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">Add pool</button>
                    </div>
                  </form>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {pools.map((pool) => (
                      <span key={pool.id} className="rounded-full bg-white px-3 py-1 text-xs text-[var(--color-afta-text)]">
                        {pool.poolName} · {pool.questionCount}
                      </span>
                    ))}
                  </div>
                </section>

                <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
                  <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Manual question entry</h2>
                  <div className="mt-4">
                    <QuestionEditor
                      value={questionForm}
                      onChange={setQuestionForm}
                      pools={pools}
                      onSubmit={handleAddQuestion}
                      saving={saving}
                      submitLabel="Add question"
                    />
                  </div>
                </section>

                <QuestionImportPanel
                  questionBankId={bankId}
                  courseId={form.courseId}
                  resolvePoolId={resolvePoolId}
                  userId={user?.uid ?? ""}
                  onImported={reloadQuestionsAndPools}
                />

                <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
                  <div className="border-b border-[var(--color-afta-border)] px-5 py-4">
                    <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Questions ({questions.length})</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                          <th className="px-4 py-3">Question</th>
                          <th className="px-4 py-3">Pool</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Pts</th>
                          <th className="px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {questions.length === 0 ? (
                          <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">No questions yet.</td></tr>
                        ) : (
                          questions.map((question) => (
                            <tr key={question.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                              <td className="px-4 py-3 text-[var(--color-afta-text)]">{question.questionText}</td>
                              <td className="px-4 py-3">{poolNameById[question.questionPoolId] || "—"}</td>
                              <td className="px-4 py-3">{QUESTION_TYPE_LABELS[question.questionType] ?? question.questionType}</td>
                              <td className="px-4 py-3">{question.points}</td>
                              <td className="px-4 py-3">
                                <button type="button" onClick={() => handleDeleteQuestion(question.id)} className="text-xs text-[#c8102e]">Delete</button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
