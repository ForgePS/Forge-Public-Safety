import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import CertificateDisplay from "../../components/CertificateDisplay.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField, FormSection, FormSelect } from "../../components/StudentFormFields.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSystemSettingsOptional } from "../../context/SystemSettingsContext.jsx";
import { listClassSessions } from "../../lib/classes.js";
import { issueManualCertificate } from "../../lib/certificates.js";
import { resolveCertificateTemplate } from "../../lib/certificateTemplates.js";
import { listActiveCourses } from "../../lib/courses.js";
import { listStudents } from "../../lib/students.js";

const today = () => new Date().toISOString().slice(0, 10);

export default function AdminCertificateCreatePage() {
  const { user } = useAuth();
  const settingsContext = useSystemSettingsOptional();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [resolvedTemplate, setResolvedTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    studentId: searchParams.get("studentId") ?? "",
    courseId: searchParams.get("courseId") ?? "",
    classId: "",
    completionDate: today(),
    hours: "",
    location: "",
    instructorNames: "",
  });

  useEffect(() => {
    Promise.all([
      listStudents().then(setStudents),
      listActiveCourses().then(setCourses),
      listClassSessions().then(setClasses),
    ])
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load form data."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!form.courseId || form.hours !== "" || courses.length === 0) return;
    const course = courses.find((item) => item.id === form.courseId);
    if (course) {
      setForm((current) => ({ ...current, hours: String(course.hours ?? "") }));
    }
  }, [courses, form.courseId, form.hours]);

  function handleClassChange(classId) {
    const session = classes.find((item) => item.id === classId);
    setForm((current) => ({
      ...current,
      classId,
      location: session?.location && !current.location ? session.location : current.location,
      instructorNames:
        session?.instructorNames?.length && !current.instructorNames
          ? session.instructorNames.join(", ")
          : current.instructorNames,
    }));
  }

  useEffect(() => {
    if (!form.courseId) {
      setResolvedTemplate(null);
      return;
    }

    let active = true;
    setTemplateLoading(true);

    resolveCertificateTemplate({ courseId: form.courseId })
      .then((template) => {
        if (active) setResolvedTemplate(template);
      })
      .catch(() => {
        if (active) setResolvedTemplate(null);
      })
      .finally(() => {
        if (active) setTemplateLoading(false);
      });

    return () => {
      active = false;
    };
  }, [form.courseId]);

  const templateContext = useMemo(
    () => ({
      issuerName:
        resolvedTemplate?.issuerNameOverride || settingsContext?.settings?.certificates?.issuerName,
      issuerTitle:
        resolvedTemplate?.issuerTitleOverride || settingsContext?.settings?.certificates?.issuerTitle,
      descriptionText: resolvedTemplate?.descriptionText,
    }),
    [resolvedTemplate, settingsContext?.settings],
  );

  const previewCertificate = useMemo(() => {
    const student = students.find((item) => item.id === form.studentId);
    const course = courses.find((item) => item.id === form.courseId);
    const studentName = student ? `${student.firstName} ${student.lastName}`.trim() : "Sample Student";
    const prefix = resolvedTemplate?.serialPrefix ?? "0002AR";

    return {
      studentName,
      courseName: course?.name ?? "Sample Course",
      courseNumber: course?.courseNumber ?? "",
      certificateNumber: `${prefix}-0000001`,
      completionDate: form.completionDate,
      hours: form.hours === "" ? Number(course?.hours ?? 0) : Number(form.hours || 0),
      location: form.location,
      instructorNames: form.instructorNames,
    };
  }, [students, courses, form, resolvedTemplate?.serialPrefix]);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === form.courseId) ?? null,
    [courses, form.courseId],
  );

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === form.studentId) ?? null,
    [students, form.studentId],
  );

  const filteredClasses = useMemo(() => {
    if (!form.courseId) return classes;
    return classes.filter((session) => session.courseId === form.courseId);
  }, [classes, form.courseId]);

  function handleCourseChange(courseId) {
    const course = courses.find((item) => item.id === courseId);
    setForm((current) => ({
      ...current,
      courseId,
      classId: current.classId && classes.some((session) => session.id === current.classId && session.courseId === courseId)
        ? current.classId
        : "",
      hours: course ? String(course.hours ?? "") : "",
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!user?.uid) return;

    setSaving(true);
    setError(null);
    try {
      const hoursValue = form.hours === "" ? undefined : Number(form.hours);
      if (form.hours !== "" && Number.isNaN(hoursValue)) {
        throw new Error("Training hours must be a number.");
      }

      const certificateId = await issueManualCertificate({
        studentId: form.studentId,
        courseId: form.courseId,
        issuedByUid: user.uid,
        completionDate: form.completionDate,
        hours: hoursValue,
        location: form.location.trim(),
        instructorNames: form.instructorNames.trim(),
        classId: form.classId,
      });

      navigate(`/admin/certificates/${certificateId}/print`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to issue certificate.");
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Issue certificate"
        subtitle="Create a completion certificate for any student — no class roster required"
        backTo="/admin/certificates"
        backLabel="Certificates"
        actions={
          <Link to="/admin/certificates" className="app-btn-secondary px-4 py-2 text-xs">
            Cancel
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-6 p-6 lg:flex-row lg:p-7">
        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700 lg:col-span-2">
            {error}
          </p>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="flex min-w-0 flex-1 flex-col gap-5 rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] p-5 shadow-sm"
        >
          <FormSection title="Student & course">
            <div className="grid gap-4 md:grid-cols-2">
              <FormSelect
                label="Student"
                name="studentId"
                value={form.studentId}
                onChange={(event) => setForm((current) => ({ ...current, studentId: event.target.value }))}
                required
                disabled={loading}
              >
                <option value="">Select student…</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.lastName}, {student.firstName}
                    {student.femaSid ? ` · ${student.femaSid}` : ""}
                  </option>
                ))}
              </FormSelect>

              <FormSelect
                label="Course"
                name="courseId"
                value={form.courseId}
                onChange={(event) => handleCourseChange(event.target.value)}
                required
                disabled={loading}
              >
                <option value="">Select course…</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.courseNumber} · {course.name}
                  </option>
                ))}
              </FormSelect>
            </div>

            {selectedStudent ? (
              <p className="mt-3 text-xs text-[var(--color-afta-muted)]">
                Issuing to {selectedStudent.firstName} {selectedStudent.lastName}
                {selectedStudent.departmentName ? ` · ${selectedStudent.departmentName}` : ""}
              </p>
            ) : null}
            {selectedCourse ? (
              <p className="mt-1 text-xs text-[var(--color-afta-muted)]">
                {templateLoading
                  ? "Loading certificate template…"
                  : resolvedTemplate
                    ? `Template: ${resolvedTemplate.name}${resolvedTemplate.isDefault ? " (default)" : ""}`
                    : "No template found — will use the built-in AFTA layout. Link a template on the course or set a default."}
              </p>
            ) : null}
          </FormSection>

          <FormSection title="Certificate details">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Completion date"
                name="completionDate"
                type="date"
                value={form.completionDate}
                onChange={(event) => setForm((current) => ({ ...current, completionDate: event.target.value }))}
                required
              />
              <FormField
                label="Training hours"
                name="hours"
                type="number"
                min="0"
                step="0.5"
                value={form.hours}
                onChange={(event) => setForm((current) => ({ ...current, hours: event.target.value }))}
                placeholder={selectedCourse ? String(selectedCourse.hours ?? "") : "From course record"}
                hint="Defaults to the course hours when left blank."
              />
              <FormSelect
                label="Class session (optional)"
                name="classId"
                value={form.classId}
                onChange={(event) => handleClassChange(event.target.value)}
                disabled={!form.courseId}
              >
                <option value="">Not linked to a class</option>
                {filteredClasses.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.startDate}
                    {session.endDate ? ` – ${session.endDate}` : ""}
                    {session.location ? ` · ${session.location}` : ""}
                  </option>
                ))}
              </FormSelect>
              <FormField
                label="Location (optional)"
                name="location"
                value={form.location}
                onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                placeholder="Training location on certificate"
              />
              <div className="md:col-span-2">
                <FormField
                  label="Instructor name(s) (optional)"
                  name="instructorNames"
                  value={form.instructorNames}
                  onChange={(event) => setForm((current) => ({ ...current, instructorNames: event.target.value }))}
                />
              </div>
            </div>
          </FormSection>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving || loading || !form.studentId || !form.courseId}
              className="rounded-[10px] bg-[#c8102e] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-60"
            >
              {saving ? "Issuing…" : "Issue & open print view"}
            </button>
            <Link to="/admin/certificates" className="app-btn-secondary px-5 py-2.5 text-xs">
              Cancel
            </Link>
          </div>
        </form>

        <aside className="w-full shrink-0 lg:w-[480px] xl:w-[560px]">
          <div className="sticky top-6 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-afta-muted)]">
              Certificate preview
            </p>
            {!form.courseId ? (
              <p className="rounded-[14px] border border-dashed border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] p-6 text-sm text-[var(--color-afta-muted)]">
                Select a course to preview the certificate layout.
              </p>
            ) : templateLoading ? (
              <p className="text-sm text-[var(--color-afta-subtle)]">Loading template…</p>
            ) : (
              <CertificateDisplay
                certificate={previewCertificate}
                template={resolvedTemplate}
                templateContext={templateContext}
                validationCode="PREVIEW00000001"
                showQr={resolvedTemplate?.showQr}
              />
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
