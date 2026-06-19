import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField, FormSection, FormSelect } from "../../components/StudentFormFields.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { listCourses } from "../../lib/courses.js";
import { listQuestionBanksByCourse } from "../../lib/questionBanks.js";
import { listTestBlueprintsByCourse } from "../../lib/testBlueprints.js";
import { listTestCategories } from "../../lib/testCategories.js";
import {
  createTest,
  getTest,
  getTestPublishPreview,
  publishTest,
  TEST_STATUSES,
  unpublishTest,
  updateTest,
} from "../../lib/tests.js";

const emptyForm = {
  name: "",
  courseId: "",
  testCategoryId: "",
  questionBankId: "",
  blueprintId: "",
  passingScore: "70",
  maxScore: "100",
  timeLimitMinutes: "",
  randomizeQuestions: true,
  randomizeAnswers: true,
  allowRetakes: false,
  maxAttempts: "",
  status: TEST_STATUSES.DRAFT,
};

export default function AdminTestFormPage() {
  const { testId } = useParams();
  const isNew = !testId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banks, setBanks] = useState([]);
  const [blueprints, setBlueprints] = useState([]);
  const [published, setPublished] = useState(false);
  const [publishErrors, setPublishErrors] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    Promise.all([listCourses().then(setCourses), listTestCategories().then(setCategories)]).catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.courseId) {
      setBanks([]);
      setBlueprints([]);
      return;
    }
    Promise.all([
      listQuestionBanksByCourse(form.courseId).then(setBanks),
      listTestBlueprintsByCourse(form.courseId).then(setBlueprints),
    ]).catch(() => {});
  }, [form.courseId]);

  useEffect(() => {
    if (isNew) return;
    getTest(testId)
      .then((test) => {
        if (!test) throw new Error("Test not found.");
        setForm({
          name: test.name,
          courseId: test.courseId,
          testCategoryId: test.testCategoryId,
          questionBankId: test.questionBankId,
          blueprintId: test.blueprintId,
          passingScore: String(test.passingScore),
          maxScore: String(test.maxScore),
          timeLimitMinutes: test.timeLimitMinutes == null ? "" : String(test.timeLimitMinutes),
          randomizeQuestions: test.randomizeQuestions,
          randomizeAnswers: test.randomizeAnswers,
          allowRetakes: test.allowRetakes,
          maxAttempts: test.maxAttempts == null ? "" : String(test.maxAttempts),
          status: test.status,
        });
        setPublished(Boolean(test.published));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load test."))
      .finally(() => setLoading(false));
  }, [isNew, testId]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    const course = courses.find((item) => item.id === form.courseId);
    const category = categories.find((item) => item.id === form.testCategoryId);
    const payload = {
      name: form.name,
      courseId: form.courseId,
      courseName: course?.name ?? "",
      courseNumber: course?.courseNumber ?? "",
      testCategoryId: form.testCategoryId,
      testCategoryName: category?.name ?? "",
      questionBankId: form.questionBankId,
      blueprintId: form.blueprintId,
      passingScore: Number(form.passingScore),
      maxScore: Number(form.maxScore),
      timeLimitMinutes: form.timeLimitMinutes ? Number(form.timeLimitMinutes) : null,
      randomizeQuestions: form.randomizeQuestions,
      randomizeAnswers: form.randomizeAnswers,
      allowRetakes: form.allowRetakes,
      maxAttempts: form.maxAttempts ? Number(form.maxAttempts) : null,
      status: form.status,
    };

    try {
      if (isNew) {
        const id = await createTest(payload, user.uid);
        navigate(`/admin/tests/${id}`);
      } else {
        await updateTest(testId, payload, user.uid);
        setMessage("Test saved.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save test.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!user || isNew) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    setPublishErrors([]);
    try {
      const preview = await getTestPublishPreview(form.blueprintId, form.questionBankId);
      setPublishErrors(preview.errors);
      if (preview.errors.length) throw new Error(preview.errors[0]);
      await publishTest(testId, user.uid);
      setPublished(true);
      setMessage("Test published.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to publish test.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUnpublish() {
    if (!user || isNew) return;
    setSaving(true);
    try {
      await unpublishTest(testId, user.uid);
      setPublished(false);
      setMessage("Test moved back to draft.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to unpublish test.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title={isNew ? "New Test" : "Edit Test"}
        subtitle="Link categories, banks, and blueprints before publishing"
        actions={
          <div className="flex gap-2">
            <Link to="/admin/testing" className="app-btn-secondary px-4 py-2 text-xs">Testing home</Link>
            <Link to="/admin/tests" className="app-btn-secondary px-4 py-2 text-xs">All tests</Link>
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="rounded-[10px] border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">{message}</p> : null}
        {publishErrors.length ? (
          <ul className="rounded-[10px] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {publishErrors.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading…</p>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
              <FormSection title="Test details">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Test name" name="name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
                  <FormSelect label="Course" name="courseId" value={form.courseId} onChange={(e) => setForm((p) => ({ ...p, courseId: e.target.value, questionBankId: "", blueprintId: "" }))} required>
                    <option value="">Select course…</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>{course.courseNumber} · {course.name}</option>
                    ))}
                  </FormSelect>
                  <FormSelect label="Test category" name="testCategoryId" value={form.testCategoryId} onChange={(e) => setForm((p) => ({ ...p, testCategoryId: e.target.value }))} required>
                    <option value="">Select category…</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </FormSelect>
                  <FormSelect label="Question bank" name="questionBankId" value={form.questionBankId} onChange={(e) => setForm((p) => ({ ...p, questionBankId: e.target.value }))} required>
                    <option value="">Select bank…</option>
                    {banks.map((bank) => (
                      <option key={bank.id} value={bank.id}>{bank.name}</option>
                    ))}
                  </FormSelect>
                  <FormSelect label="Blueprint" name="blueprintId" value={form.blueprintId} onChange={(e) => setForm((p) => ({ ...p, blueprintId: e.target.value }))} required>
                    <option value="">Select blueprint…</option>
                    {blueprints.map((blueprint) => (
                      <option key={blueprint.id} value={blueprint.id}>{blueprint.testName}</option>
                    ))}
                  </FormSelect>
                  <FormField label="Passing score" name="passingScore" value={form.passingScore} onChange={(e) => setForm((p) => ({ ...p, passingScore: e.target.value }))} />
                  <FormField label="Max score" name="maxScore" value={form.maxScore} onChange={(e) => setForm((p) => ({ ...p, maxScore: e.target.value }))} />
                  <FormField label="Time limit (minutes)" name="timeLimitMinutes" value={form.timeLimitMinutes} onChange={(e) => setForm((p) => ({ ...p, timeLimitMinutes: e.target.value }))} />
                  <FormField label="Max attempts" name="maxAttempts" value={form.maxAttempts} onChange={(e) => setForm((p) => ({ ...p, maxAttempts: e.target.value }))} />
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-[var(--color-afta-text)]">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={form.randomizeQuestions} onChange={(e) => setForm((p) => ({ ...p, randomizeQuestions: e.target.checked }))} className="accent-[#c8102e]" />Randomize questions</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={form.randomizeAnswers} onChange={(e) => setForm((p) => ({ ...p, randomizeAnswers: e.target.checked }))} className="accent-[#c8102e]" />Randomize answers</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={form.allowRetakes} onChange={(e) => setForm((p) => ({ ...p, allowRetakes: e.target.checked }))} className="accent-[#c8102e]" />Allow retakes</label>
                </div>
              </FormSection>
              <button type="submit" disabled={saving} className="mt-4 rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">{saving ? "Saving…" : "Save test"}</button>
            </form>

            {!isNew ? (
              <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
                <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Publish</h2>
                <p className="mt-2 text-sm text-[var(--color-afta-subtle)]">
                  {published ? "This test is published and ready for scheduling." : "Publishing validates the linked blueprint against available pool questions."}
                </p>
                <div className="mt-4 flex gap-3">
                  {published ? (
                    <button type="button" disabled={saving} onClick={handleUnpublish} className="rounded-[10px] border border-[var(--color-afta-border)] px-4 py-2 text-xs font-semibold text-[var(--color-afta-subtle)] disabled:opacity-60">Unpublish</button>
                  ) : (
                    <button type="button" disabled={saving} onClick={handlePublish} className="rounded-[10px] bg-green-600 px-4 py-2 text-xs font-bold text-[var(--color-afta-text)] disabled:opacity-60">Publish test</button>
                  )}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
