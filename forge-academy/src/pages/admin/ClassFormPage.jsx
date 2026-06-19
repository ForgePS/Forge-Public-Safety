import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import ClassQuickLinks from "../../components/ClassQuickLinks.jsx";
import { FormField, FormSection, FormSelect, FormTextarea } from "../../components/StudentFormFields.jsx";
import {
  CLASS_STATUSES,
  CLASS_STATUS_LABELS,
  DELIVERY_TYPES,
  DELIVERY_TYPE_LABELS,
  LOCATION_TYPES,
  LOCATION_TYPE_LABELS,
  cancelClassSession,
  createClassSession,
  getClassSession,
  resolveInstructorNames,
  updateClassSession,
} from "../../lib/classes.js";
import { listActiveCourses } from "../../lib/courses.js";
import { listActiveInstructors, instructorDisplayName } from "../../lib/instructors.js";

const emptyForm = {
  courseId: "",
  startDate: "",
  endDate: "",
  startTime: "08:00",
  endTime: "17:00",
  location: "",
  locationType: LOCATION_TYPES.ON_CAMPUS,
  instructorIds: [],
  enrollmentCap: "20",
  waitlistCap: "5",
  registrationDeadline: "",
  cancellationDeadline: "",
  mealLodgingNotes: "",
  housingNotes: "",
  deliveryType: DELIVERY_TYPES.ON_CAMPUS_NO_HOUSING,
  notes: "",
  status: CLASS_STATUSES.DRAFT,
};

export default function ClassFormPage() {
  const { classId } = useParams();
  const isNew = !classId;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState(emptyForm);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [showHousingLink, setShowHousingLink] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      try {
        const [courseData, instructorData] = await Promise.all([
          listActiveCourses(),
          listActiveInstructors(),
        ]);
        if (!active) return;
        setCourses(courseData);
        setInstructors(instructorData);
      } catch {
        // Non-blocking.
      }
    }

    loadOptions();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isNew) return;
    const prefillCourseId = searchParams.get("courseId");
    if (!prefillCourseId) return;
    setForm((current) => ({ ...current, courseId: prefillCourseId }));
  }, [isNew, searchParams]);

  useEffect(() => {
    if (isNew) return;

    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const session = await getClassSession(classId);
        if (!session) throw new Error("Class session not found.");
        if (active) {
          setForm({
            courseId: session.courseId,
            startDate: session.startDate,
            endDate: session.endDate,
            startTime: session.startTime,
            endTime: session.endTime,
            location: session.location,
            locationType: session.locationType,
            instructorIds: session.instructorIds,
            enrollmentCap: String(session.enrollmentCap),
            waitlistCap: String(session.waitlistCap),
            registrationDeadline: session.registrationDeadline,
            cancellationDeadline: session.cancellationDeadline,
            mealLodgingNotes: session.mealLodgingNotes,
            housingNotes: session.housingNotes,
            deliveryType: session.deliveryType,
            notes: session.notes,
            status: session.status,
          });
          setCatalog(
            session.catalogDescription
              ? {
                  courseName: session.catalogCourseName,
                  section: session.catalogSection,
                  description: session.catalogDescription,
                  prerequisites: session.catalogPrerequisites,
                  book: session.catalogBook,
                  hours: session.catalogHours,
                }
              : null,
          );
          setShowHousingLink(
            session.deliveryType === DELIVERY_TYPES.ON_CAMPUS_HOUSING_REQUIRED || Boolean(session.housingRequired),
          );
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load class session.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [classId, isNew]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError(null);
  }

  function toggleInstructor(userId) {
    setForm((current) => {
      const selected = current.instructorIds.includes(userId)
        ? current.instructorIds.filter((item) => item !== userId)
        : [...current.instructorIds, userId];
      return { ...current, instructorIds: selected };
    });
    setError(null);
  }

  function buildPayload() {
    return {
      courseId: form.courseId,
      startDate: form.startDate,
      endDate: form.endDate,
      startTime: form.startTime,
      endTime: form.endTime,
      location: form.location,
      locationType: form.locationType,
      instructorIds: form.instructorIds,
      instructorNames: resolveInstructorNames(form.instructorIds, instructors.map((item) => ({
        uid: item.userId,
        displayName: instructorDisplayName(item),
      })).filter((item) => item.uid)),
      enrollmentCap: Number(form.enrollmentCap),
      waitlistCap: Number(form.waitlistCap),
      registrationDeadline: form.registrationDeadline,
      cancellationDeadline: form.cancellationDeadline,
      mealLodgingNotes: form.mealLodgingNotes,
      housingNotes: form.housingNotes,
      deliveryType: form.deliveryType,
      notes: form.notes,
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
        const id = await createClassSession(payload);
        navigate(`/admin/scheduling/${id}/roster`);
      } else {
        await updateClassSession(classId, payload);
        navigate("/admin/scheduling");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save class session.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelClass() {
    if (!classId || !window.confirm("Cancel this class session?")) return;

    setSaving(true);
    setError(null);
    try {
      await cancelClassSession(classId);
      navigate("/admin/scheduling");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel class session.");
    } finally {
      setSaving(false);
    }
  }

  const selectedCourse = courses.find((course) => course.id === form.courseId);

  if (loading) {
    return <div className="grid flex-1 place-items-center text-[var(--color-afta-subtle)]">Loading class session…</div>;
  }

  return (
    <>
      <PageHeader
        title={isNew ? "Schedule Class" : "Edit Class Session"}
        subtitle={
          isNew
            ? "Create a scheduled offering from the course catalog"
            : selectedCourse
              ? `${selectedCourse.courseNumber} · ${selectedCourse.name}`
              : "Class session details"
        }
        backTo="/admin/scheduling"
        backLabel="Back to classes"
        actions={
          !isNew && classId ? (
            <ClassQuickLinks classId={classId} showHousing={showHousingLink} variant="primary" />
          ) : (
            <Link to="/admin/scheduling" className="app-btn-secondary px-4 py-2 text-xs">
              Back to classes
            </Link>
          )
        }
      />

      <form className="flex flex-1 flex-col gap-5 p-6 lg:p-7" onSubmit={handleSubmit}>
        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <FormSection title="Course and schedule">
          <FormSelect
            label="Course"
            name="courseId"
            value={form.courseId}
            onChange={handleChange}
            required
            options={[
              { value: "", label: "Select course" },
              ...courses.map((course) => ({
                value: course.id,
                label: `${course.courseNumber} · ${course.name}`,
              })),
            ]}
          />
          <FormField
            label="Start date"
            name="startDate"
            type="date"
            value={form.startDate}
            onChange={handleChange}
            required
          />
          <FormField
            label="End date"
            name="endDate"
            type="date"
            value={form.endDate}
            onChange={handleChange}
            required
          />
          <FormField label="Start time" name="startTime" type="time" value={form.startTime} onChange={handleChange} />
          <FormField label="End time" name="endTime" type="time" value={form.endTime} onChange={handleChange} />
          <FormSelect
            label="Status"
            name="status"
            value={form.status}
            onChange={handleChange}
            options={Object.entries(CLASS_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </FormSection>

        <FormSection title="Location">
          <FormField label="Location" name="location" value={form.location} onChange={handleChange} required />
          <FormSelect
            label="Location type"
            name="locationType"
            value={form.locationType}
            onChange={handleChange}
            options={Object.entries(LOCATION_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <FormSelect
            label="Class delivery type"
            name="deliveryType"
            value={form.deliveryType}
            onChange={handleChange}
            options={Object.entries(DELIVERY_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <FormField
            label="Registration deadline"
            name="registrationDeadline"
            type="date"
            value={form.registrationDeadline}
            onChange={handleChange}
          />
          <FormField
            label="Cancellation deadline"
            name="cancellationDeadline"
            type="date"
            value={form.cancellationDeadline}
            onChange={handleChange}
          />
        </FormSection>

        <FormSection title="Capacity">
          <FormField
            label="Enrollment cap"
            name="enrollmentCap"
            type="number"
            value={form.enrollmentCap}
            onChange={handleChange}
            required
          />
          <FormField
            label="Waitlist cap"
            name="waitlistCap"
            type="number"
            value={form.waitlistCap}
            onChange={handleChange}
          />
        </FormSection>

        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
          <h2 className="mb-4 text-sm font-semibold">Instructors</h2>
          {instructors.length === 0 ? (
            <p className="text-sm text-[var(--color-afta-subtle)]">
              No instructor profiles found. Add instructors under Admin → Instructors and link portal users.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {instructors.map((instructor) => {
                const portalId = instructor.userId;
                const disabled = !portalId;
                return (
                  <label
                    key={instructor.id}
                    className={`flex items-start gap-3 rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2.5 ${disabled ? "opacity-50" : ""}`}
                  >
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={portalId ? form.instructorIds.includes(portalId) : false}
                      onChange={() => portalId && toggleInstructor(portalId)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-medium text-[var(--color-afta-text)]">
                        {instructorDisplayName(instructor)}
                      </span>
                      <span className="block text-xs text-[var(--color-afta-muted)]">
                        {instructor.email}
                        {!portalId ? " · link portal user required" : ""}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
          <FormTextarea
            label="Meal / lodging notes"
            name="mealLodgingNotes"
            value={form.mealLodgingNotes}
            onChange={handleChange}
          />
          {form.deliveryType === DELIVERY_TYPES.ON_CAMPUS_HOUSING_REQUIRED ? (
            <div className="mt-4">
              <FormTextarea
                label="Housing notes (shown to students)"
                name="housingNotes"
                value={form.housingNotes}
                onChange={handleChange}
              />
            </div>
          ) : null}
          {!isNew && form.deliveryType === DELIVERY_TYPES.ON_CAMPUS_HOUSING_REQUIRED ? (
            <Link
              to={`/admin/housing/${classId}`}
              className="mt-4 inline-block text-xs font-semibold text-[#c8102e] hover:underline"
            >
              Open housing roster and room assignments →
            </Link>
          ) : null}
        </section>

        {catalog ? (
          <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-white p-5">
            <h2 className="mb-1 text-sm font-semibold text-[var(--color-afta-text)]">AFTA 2026 Catalog</h2>
            {catalog.courseName ? (
              <p className="mb-4 text-xs text-[var(--color-afta-muted)]">
                {catalog.courseName}
                {catalog.section ? ` · ${catalog.section}` : ""}
                {catalog.hours ? ` · ${catalog.hours} hours` : ""}
              </p>
            ) : null}
            <p className="text-sm leading-relaxed text-[var(--color-afta-text)]">{catalog.description}</p>
            {catalog.prerequisites ? (
              <p className="mt-4 text-sm text-[var(--color-afta-subtle)]">
                <span className="font-semibold text-[var(--color-afta-muted)]">Prerequisites: </span>
                {catalog.prerequisites}
              </p>
            ) : null}
            {catalog.book ? (
              <p className="mt-2 text-sm text-[var(--color-afta-subtle)]">
                <span className="font-semibold text-[var(--color-afta-muted)]">Textbook: </span>
                {catalog.book}
              </p>
            ) : null}
          </section>
        ) : null}

        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
          <FormTextarea label="Notes" name="notes" value={form.notes} onChange={handleChange} />
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-[10px] bg-[#c8102e] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : isNew ? "Schedule class" : "Save changes"}
          </button>

          {!isNew && form.status !== CLASS_STATUSES.CANCELLED ? (
            <button
              type="button"
              disabled={saving}
              onClick={handleCancelClass}
              className="rounded-[10px] border border-[var(--color-afta-border)] px-5 py-2.5 text-sm font-semibold text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)]"
            >
              Cancel class
            </button>
          ) : null}
        </div>
      </form>
    </>
  );
}
