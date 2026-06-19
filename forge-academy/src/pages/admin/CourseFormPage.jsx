import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField, FormSection, FormSelect, FormTextarea } from "../../components/StudentFormFields.jsx";
import {
  COURSE_CATEGORIES,
  COURSE_CATEGORY_LABELS,
  COURSE_STATUSES,
  createCourse,
  deactivateCourse,
  formatDocumentList,
  getCourse,
  listCourses,
  updateCourse,
} from "../../lib/courses.js";
import { listCertificateTemplates } from "../../lib/certificateTemplates.js";
import { listTestsByCourse } from "../../lib/tests.js";

const emptyForm = {
  name: "",
  courseNumber: "",
  description: "",
  hours: "40",
  category: COURSE_CATEGORIES.FIREFIGHTER_I,
  certificationType: "",
  prerequisiteCourseIds: [],
  requiredDocumentsText: "",
  requiredEquipment: "",
  minEnrollment: "0",
  maxEnrollment: "20",
  testRequired: false,
  skillsRequired: false,
  certificateIssued: true,
  certificateTemplateId: "",
  requiredTestIds: [],
  status: COURSE_STATUSES.ACTIVE,
};

export default function CourseFormPage() {
  const { courseId } = useParams();
  const isNew = !courseId;
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [allCourses, setAllCourses] = useState([]);
  const [certificateTemplates, setCertificateTemplates] = useState([]);
  const [courseTests, setCourseTests] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadCourses() {
      try {
        const [data, templates] = await Promise.all([listCourses(), listCertificateTemplates()]);
        if (active) {
          setAllCourses(data);
          setCertificateTemplates(templates);
        }
      } catch {
        // Non-blocking.
      }
    }

    loadCourses();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isNew) return;

    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const course = await getCourse(courseId);
        if (!course) throw new Error("Course not found.");
        if (active) {
          setForm({
            name: course.name,
            courseNumber: course.courseNumber,
            description: course.description,
            hours: String(course.hours),
            category: course.category,
            certificationType: course.certificationType,
            prerequisiteCourseIds: course.prerequisiteCourseIds,
            requiredDocumentsText: formatDocumentList(course.requiredDocuments),
            requiredEquipment: course.requiredEquipment,
            minEnrollment: String(course.minEnrollment),
            maxEnrollment: String(course.maxEnrollment),
            testRequired: course.testRequired,
            skillsRequired: course.skillsRequired,
            certificateIssued: course.certificateIssued,
            certificateTemplateId: course.certificateTemplateId,
            requiredTestIds: course.requiredTestIds,
            status: course.status,
          });
          const tests = await listTestsByCourse(courseId);
          if (active) setCourseTests(tests);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load course.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [courseId, isNew]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError(null);
  }

  function togglePrerequisite(id) {
    setForm((current) => {
      const selected = current.prerequisiteCourseIds.includes(id)
        ? current.prerequisiteCourseIds.filter((item) => item !== id)
        : [...current.prerequisiteCourseIds, id];
      return { ...current, prerequisiteCourseIds: selected };
    });
    setError(null);
  }

  function toggleRequiredTest(id) {
    setForm((current) => {
      const selected = current.requiredTestIds.includes(id)
        ? current.requiredTestIds.filter((item) => item !== id)
        : [...current.requiredTestIds, id];
      return { ...current, requiredTestIds: selected };
    });
    setError(null);
  }

  function buildPayload() {
    return {
      name: form.name,
      courseNumber: form.courseNumber,
      description: form.description,
      hours: Number(form.hours),
      category: form.category,
      certificationType: form.certificationType,
      prerequisiteCourseIds: form.prerequisiteCourseIds,
      requiredDocuments: form.requiredDocumentsText,
      requiredEquipment: form.requiredEquipment,
      minEnrollment: Number(form.minEnrollment),
      maxEnrollment: Number(form.maxEnrollment),
      testRequired: form.testRequired,
      skillsRequired: form.skillsRequired,
      certificateIssued: form.certificateIssued,
      certificateTemplateId: form.certificateTemplateId,
      requiredTestIds: form.requiredTestIds,
      status: form.status,
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = buildPayload();
      if (isNew) {
        const id = await createCourse(payload);
        navigate(`/admin/courses/${id}`);
      } else {
        await updateCourse(courseId, payload);
        navigate("/admin/courses");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save course.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!courseId || !window.confirm("Mark this course as inactive?")) return;

    setSaving(true);
    setError(null);
    try {
      await deactivateCourse(courseId);
      navigate("/admin/courses");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deactivate course.");
    } finally {
      setSaving(false);
    }
  }

  const prerequisiteOptions = allCourses.filter((course) => course.id !== courseId);

  if (loading) {
    return <div className="grid flex-1 place-items-center text-[var(--color-afta-subtle)]">Loading course…</div>;
  }

  return (
    <>
      <PageHeader
        title={isNew ? "Add Course" : "Edit Course"}
        subtitle={isNew ? "Define a catalog course and prerequisites" : form.courseNumber}
        backTo="/admin/courses"
        backLabel="Back to courses"
        actions={
          <div className="flex flex-wrap gap-2">
            {!isNew ? (
              <Link
                to={`/admin/scheduling/new?courseId=${courseId}`}
                className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
              >
                Schedule class
              </Link>
            ) : null}
            <Link to="/admin/courses" className="app-btn-secondary px-4 py-2 text-xs">
              Back to courses
            </Link>
          </div>
        }
      />

      <form className="flex flex-1 flex-col gap-5 p-6 lg:p-7" onSubmit={handleSubmit}>
        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <FormSection title="Course details">
          <FormField label="Course name" name="name" value={form.name} onChange={handleChange} required />
          <FormField
            label="Course number"
            name="courseNumber"
            value={form.courseNumber}
            onChange={handleChange}
            required
            hint="Example: FF-101"
          />
          <FormSelect
            label="Category"
            name="category"
            value={form.category}
            onChange={handleChange}
            required
            options={Object.entries(COURSE_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <FormField
            label="Hours"
            name="hours"
            type="number"
            value={form.hours}
            onChange={handleChange}
            required
          />
          <FormField
            label="Certification type"
            name="certificationType"
            value={form.certificationType}
            onChange={handleChange}
            placeholder="Firefighter I"
          />
          <FormSelect
            label="Status"
            name="status"
            value={form.status}
            onChange={handleChange}
            options={[
              { value: COURSE_STATUSES.ACTIVE, label: "Active" },
              { value: COURSE_STATUSES.INACTIVE, label: "Inactive" },
            ]}
          />
        </FormSection>

        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
          <FormTextarea label="Description" name="description" value={form.description} onChange={handleChange} />
        </section>

        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
          <h2 className="mb-4 text-sm font-semibold">Prerequisites</h2>
          {prerequisiteOptions.length === 0 ? (
            <p className="text-sm text-[var(--color-afta-subtle)]">Add other courses first to define prerequisites.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {prerequisiteOptions.map((course) => (
                <label
                  key={course.id}
                  className="flex items-start gap-3 rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2.5"
                >
                  <input
                    type="checkbox"
                    checked={form.prerequisiteCourseIds.includes(course.id)}
                    onChange={() => togglePrerequisite(course.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-[var(--color-afta-text)]">{course.name}</span>
                    <span className="block font-mono text-[11px] text-[#c8102e]">{course.courseNumber}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </section>

        <FormSection title="Enrollment and delivery">
          <FormField
            label="Minimum enrollment"
            name="minEnrollment"
            type="number"
            value={form.minEnrollment}
            onChange={handleChange}
          />
          <FormField
            label="Maximum enrollment"
            name="maxEnrollment"
            type="number"
            value={form.maxEnrollment}
            onChange={handleChange}
          />
          <FormField
            label="Required equipment / PPE"
            name="requiredEquipment"
            value={form.requiredEquipment}
            onChange={handleChange}
          />
          <label className="flex items-center gap-3 rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2.5 sm:col-span-2">
            <input type="checkbox" name="skillsRequired" checked={form.skillsRequired} onChange={handleChange} />
            <span className="text-sm">Skills evaluation required</span>
          </label>
          <label className="flex items-center gap-3 rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2.5 sm:col-span-2">
            <input type="checkbox" name="testRequired" checked={form.testRequired} onChange={handleChange} />
            <span className="text-sm">Written test required</span>
          </label>
          <label className="flex items-center gap-3 rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2.5 sm:col-span-2">
            <input
              type="checkbox"
              name="certificateIssued"
              checked={form.certificateIssued}
              onChange={handleChange}
            />
            <span className="text-sm">Certificate issued upon completion</span>
          </label>
        </FormSection>

        <FormSection title="Testing & certificates">
          <FormSelect
            label="Certificate template"
            name="certificateTemplateId"
            value={form.certificateTemplateId}
            onChange={handleChange}
            options={[
              { value: "", label: "Use default template" },
              ...certificateTemplates.map((template) => ({
                value: template.id,
                label: `${template.name}${template.isDefault ? " (default)" : ""}`,
              })),
            ]}
          />
          <p className="text-[11px] text-[var(--color-afta-muted)] sm:col-span-2">
            Links this course to a certificate layout and serial number prefix.{" "}
            <Link to="/admin/certificates/templates" className="text-[#c8102e]">
              Manage templates
            </Link>
          </p>
          {!isNew && courseTests.length > 0 ? (
            <div className="sm:col-span-2">
              <p className="app-label">Required written tests</p>
              <p className="mb-2 text-[11px] text-[var(--color-afta-muted)]">
                Leave all unchecked to require every active test for this course.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {courseTests.map((test) => (
                  <label
                    key={test.id}
                    className="flex items-start gap-3 rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2.5"
                  >
                    <input
                      type="checkbox"
                      checked={form.requiredTestIds.includes(test.id)}
                      onChange={() => toggleRequiredTest(test.id)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-medium text-[var(--color-afta-text)]">{test.name}</span>
                      <span className="block text-[11px] text-[var(--color-afta-muted)]">
                        Pass {test.passingScore}% ·{" "}
                        <Link to={`/admin/tests/${test.id}`} className="text-[#c8102e]">
                          Edit test
                        </Link>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : !isNew ? (
            <p className="text-sm text-[var(--color-afta-subtle)] sm:col-span-2">
              No tests linked yet.{" "}
              <Link to="/admin/tests/new" className="text-[#c8102e]">
                Create a test
              </Link>{" "}
              and assign it to this course.
            </p>
          ) : (
            <p className="text-sm text-[var(--color-afta-subtle)] sm:col-span-2">
              Save the course first, then link written tests from the Tests admin area.
            </p>
          )}
        </FormSection>

        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
          <FormTextarea
            label="Required documents"
            name="requiredDocumentsText"
            value={form.requiredDocumentsText}
            onChange={handleChange}
            rows={5}
          />
          <p className="mt-2 text-[11px] text-[var(--color-afta-muted)]">One document per line.</p>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-[10px] bg-[#c8102e] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : isNew ? "Create course" : "Save changes"}
          </button>

          {!isNew && form.status === COURSE_STATUSES.ACTIVE ? (
            <button
              type="button"
              disabled={saving}
              onClick={handleDeactivate}
              className="rounded-[10px] border border-[var(--color-afta-border)] px-5 py-2.5 text-sm font-semibold text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)]"
            >
              Mark inactive
            </button>
          ) : null}
        </div>
      </form>
    </>
  );
}
