import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField, FormSection, FormSelect } from "../../components/StudentFormFields.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { listCourses } from "../../lib/courses.js";
import { listQuestionBanksByCourse } from "../../lib/questionBanks.js";
import { listQuestionPoolsByBank } from "../../lib/questionPools.js";
import {
  countQuestionsByPoolAndDifficulty,
} from "../../lib/testQuestions.js";
import {
  createTestBlueprint,
  getTestBlueprint,
  updateTestBlueprint,
  validateBlueprint,
} from "../../lib/testBlueprints.js";

const emptyBlueprint = {
  testName: "",
  courseId: "",
  totalQuestions: "50",
  passingScore: "70",
  timeLimitMinutes: "120",
  randomizeQuestions: true,
  randomizeAnswers: true,
  allowRetakes: false,
  maxAttempts: "",
  active: true,
};

const emptyRule = { questionPoolId: "", numberOfQuestions: "10" };

export default function AdminTestBlueprintFormPage() {
  const { blueprintId } = useParams();
  const isNew = !blueprintId;
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState(emptyBlueprint);
  const [courses, setCourses] = useState([]);
  const [banks, setBanks] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [pools, setPools] = useState([]);
  const [poolRules, setPoolRules] = useState([emptyRule]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const configuredTotal = useMemo(
    () => poolRules.reduce((sum, rule) => sum + Number(rule.numberOfQuestions || 0), 0),
    [poolRules],
  );

  useEffect(() => {
    listCourses().then(setCourses).catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.courseId) {
      setBanks([]);
      return;
    }
    listQuestionBanksByCourse(form.courseId).then(setBanks).catch(() => {});
  }, [form.courseId]);

  useEffect(() => {
    if (!selectedBankId) {
      setPools([]);
      return;
    }
    listQuestionPoolsByBank(selectedBankId).then(setPools).catch(() => {});
  }, [selectedBankId]);

  useEffect(() => {
    if (isNew) return;
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const blueprint = await getTestBlueprint(blueprintId);
        if (!blueprint) throw new Error("Blueprint not found.");
        if (!active) return;
        setForm({
          testName: blueprint.testName,
          courseId: blueprint.courseId,
          totalQuestions: String(blueprint.totalQuestions),
          passingScore: String(blueprint.passingScore),
          timeLimitMinutes: blueprint.timeLimitMinutes == null ? "" : String(blueprint.timeLimitMinutes),
          randomizeQuestions: blueprint.randomizeQuestions,
          randomizeAnswers: blueprint.randomizeAnswers,
          allowRetakes: blueprint.allowRetakes,
          maxAttempts: blueprint.maxAttempts == null ? "" : String(blueprint.maxAttempts),
          active: blueprint.active,
        });
        setPoolRules(
          blueprint.poolRules.length
            ? blueprint.poolRules.map((rule) => ({
                questionPoolId: rule.questionPoolId,
                numberOfQuestions: String(rule.numberOfQuestions),
              }))
            : [emptyRule],
        );
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load blueprint.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [blueprintId, isNew]);

  async function validateCurrentBlueprint(courseName) {
    const payload = buildPayload(courseName);
    const poolCounts = selectedBankId
      ? await countQuestionsByPoolAndDifficulty(selectedBankId)
      : {};
    setValidationErrors(validateBlueprint(payload, poolCounts));
  }

  function buildPayload(courseName) {
    return {
      id: blueprintId ?? "",
      courseId: form.courseId,
      courseName,
      testName: form.testName,
      totalQuestions: Number(form.totalQuestions),
      passingScore: Number(form.passingScore),
      timeLimitMinutes: form.timeLimitMinutes ? Number(form.timeLimitMinutes) : null,
      poolRules: poolRules.map((rule) => ({
        questionPoolId: rule.questionPoolId,
        numberOfQuestions: Number(rule.numberOfQuestions || 0),
      })),
      randomizeQuestions: form.randomizeQuestions,
      randomizeAnswers: form.randomizeAnswers,
      allowRetakes: form.allowRetakes,
      maxAttempts: form.maxAttempts ? Number(form.maxAttempts) : null,
      active: form.active,
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    const course = courses.find((item) => item.id === form.courseId);
    const payload = buildPayload(course?.name ?? "");

    try {
      const poolCounts = selectedBankId
        ? await countQuestionsByPoolAndDifficulty(selectedBankId)
        : {};
      const errors = validateBlueprint(payload, poolCounts);
      setValidationErrors(errors);
      if (errors.length) throw new Error(errors[0]);

      if (isNew) {
        const id = await createTestBlueprint(payload, user.uid);
        navigate(`/admin/testing/blueprints/${id}`);
      } else {
        await updateTestBlueprint(blueprintId, payload, user.uid);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save blueprint.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title={isNew ? "New Test Blueprint" : "Edit Test Blueprint"}
        subtitle="Define pool counts that make up an exam"
        actions={
          <Link to="/admin/testing/blueprints" className="app-btn-secondary px-4 py-2 text-xs">
            Back to blueprints
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {validationErrors.length ? (
          <ul className="rounded-[10px] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {validationErrors.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
              <FormSection title="Blueprint details">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Test name" name="testName" value={form.testName} onChange={(e) => setForm((p) => ({ ...p, testName: e.target.value }))} required />
                  <FormSelect label="Course" name="courseId" value={form.courseId} onChange={(e) => setForm((p) => ({ ...p, courseId: e.target.value }))} required>
                    <option value="">Select course…</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>{course.courseNumber} · {course.name}</option>
                    ))}
                  </FormSelect>
                  <FormSelect label="Question bank (for validation)" name="selectedBankId" value={selectedBankId} onChange={(e) => setSelectedBankId(e.target.value)}>
                    <option value="">Select bank to validate pool counts…</option>
                    {banks.map((bank) => (
                      <option key={bank.id} value={bank.id}>{bank.name}</option>
                    ))}
                  </FormSelect>
                  <FormField label="Total questions" name="totalQuestions" value={form.totalQuestions} onChange={(e) => setForm((p) => ({ ...p, totalQuestions: e.target.value }))} />
                  <FormField label="Passing score (%)" name="passingScore" value={form.passingScore} onChange={(e) => setForm((p) => ({ ...p, passingScore: e.target.value }))} />
                  <FormField label="Time limit (minutes)" name="timeLimitMinutes" value={form.timeLimitMinutes} onChange={(e) => setForm((p) => ({ ...p, timeLimitMinutes: e.target.value }))} />
                  <FormField label="Max attempts" name="maxAttempts" value={form.maxAttempts} onChange={(e) => setForm((p) => ({ ...p, maxAttempts: e.target.value }))} />
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-[var(--color-afta-text)]">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={form.randomizeQuestions} onChange={(e) => setForm((p) => ({ ...p, randomizeQuestions: e.target.checked }))} className="accent-[#c8102e]" />Randomize questions</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={form.randomizeAnswers} onChange={(e) => setForm((p) => ({ ...p, randomizeAnswers: e.target.checked }))} className="accent-[#c8102e]" />Randomize answers</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={form.allowRetakes} onChange={(e) => setForm((p) => ({ ...p, allowRetakes: e.target.checked }))} className="accent-[#c8102e]" />Allow retakes</label>
                </div>
              </FormSection>
            </section>

            <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Pool rules</h2>
                <p className="text-xs text-[var(--color-afta-muted)]">Configured total: {configuredTotal}</p>
              </div>
              <div className="space-y-3">
                {poolRules.map((rule, index) => (
                  <div key={index} className="grid gap-3 md:grid-cols-[1fr_160px_auto]">
                    <FormSelect label="Question pool" name={`pool-${index}`} value={rule.questionPoolId} onChange={(e) => setPoolRules((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, questionPoolId: e.target.value } : row))}>
                      <option value="">Select pool…</option>
                      {pools.map((pool) => (
                        <option key={pool.id} value={pool.id}>{pool.poolName} ({pool.questionCount})</option>
                      ))}
                    </FormSelect>
                    <FormField label="Questions" name={`count-${index}`} value={rule.numberOfQuestions} onChange={(e) => setPoolRules((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, numberOfQuestions: e.target.value } : row))} />
                    <div className="flex items-end">
                      <button type="button" onClick={() => setPoolRules((rows) => rows.filter((_, rowIndex) => rowIndex !== index))} className="rounded-[10px] border border-[var(--color-afta-border)] px-3 py-2 text-xs text-[var(--color-afta-subtle)]">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => setPoolRules((rows) => [...rows, { ...emptyRule }])} className="rounded-[10px] border border-[var(--color-afta-border)] px-3 py-2 text-xs font-semibold text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)]">Add pool rule</button>
                <button type="button" onClick={() => validateCurrentBlueprint(courses.find((item) => item.id === form.courseId)?.name ?? "")} className="rounded-[10px] border border-[var(--color-afta-border)] px-3 py-2 text-xs font-semibold text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)]">Validate blueprint</button>
              </div>
            </section>

            <button type="submit" disabled={saving} className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
              {saving ? "Saving…" : "Save blueprint"}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
