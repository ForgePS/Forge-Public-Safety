import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField, FormSection, FormSelect, FormTextarea } from "../../components/StudentFormFields.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { listClassSessions } from "../../lib/classes.js";
import {
  ASSIGNMENT_ROLE_LABELS,
  ASSIGNMENT_ROLES,
  ASSIGNMENT_STATUS_LABELS,
  assignInstructorToClass,
  cancelInstructorAssignment,
  listAssignmentsByInstructorId,
} from "../../lib/instructorAssignments.js";
import {
  AVAILABILITY_TYPE_LABELS,
  AVAILABILITY_TYPES,
  createInstructorAvailability,
  deleteInstructorAvailability,
  listInstructorAvailability,
} from "../../lib/instructorAvailability.js";
import {
  CREDENTIAL_STATUS_LABELS,
  CREDENTIAL_STATUSES,
  createInstructorCertification,
  deleteInstructorCertification,
  listInstructorCertifications,
} from "../../lib/instructorCertifications.js";
import {
  averageEvaluationRating,
  createInstructorEvaluation,
  listInstructorEvaluations,
} from "../../lib/instructorEvaluations.js";
import {
  INSTRUCTOR_STATUSES,
  INSTRUCTOR_STATUS_LABELS,
  createInstructor,
  deactivateInstructor,
  getInstructor,
  instructorDisplayName,
  updateInstructor,
} from "../../lib/instructors.js";
import { ROLES } from "../../lib/roles.js";
import { listUsersByRole } from "../../lib/users.js";

const emptyProfile = {
  userId: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  employeeId: "",
  specialties: "",
  bio: "",
  status: INSTRUCTOR_STATUSES.ACTIVE,
  notes: "",
};

const emptyCredential = {
  name: "",
  credentialNumber: "",
  issuingBody: "",
  issuedDate: "",
  expirationDate: "",
  status: CREDENTIAL_STATUSES.ACTIVE,
  notes: "",
};

const emptyAvailability = {
  startDate: "",
  endDate: "",
  availabilityType: AVAILABILITY_TYPES.UNAVAILABLE,
  notes: "",
};

export default function InstructorFormPage() {
  const { instructorId } = useParams();
  const isNew = !instructorId;
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState(emptyProfile);
  const [portalUsers, setPortalUsers] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [classes, setClasses] = useState([]);
  const [credentialForm, setCredentialForm] = useState(emptyCredential);
  const [availabilityForm, setAvailabilityForm] = useState(emptyAvailability);
  const [assignClassId, setAssignClassId] = useState("");
  const [assignRole, setAssignRole] = useState(ASSIGNMENT_ROLES.LEAD);
  const [evaluationForm, setEvaluationForm] = useState({
    classId: "",
    studentName: "",
    rating: "5",
    comments: "",
    sessionDate: "",
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function reloadRelated() {
    if (!instructorId) return;
    const [certs, avail, assigns, evals] = await Promise.all([
      listInstructorCertifications(instructorId),
      listInstructorAvailability(instructorId),
      listAssignmentsByInstructorId(instructorId),
      listInstructorEvaluations(instructorId),
    ]);
    setCertifications(certs);
    setAvailability(avail);
    setAssignments(assigns);
    setEvaluations(evals);
  }

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      try {
        const [users, classSessions] = await Promise.all([
          listUsersByRole(ROLES.INSTRUCTOR),
          listClassSessions(),
        ]);
        if (!active) return;
        setPortalUsers(users);
        setClasses(classSessions);
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
    if (isNew) return;

    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const instructor = await getInstructor(instructorId);
        if (!instructor) throw new Error("Instructor not found.");
        if (!active) return;

        setForm({
          userId: instructor.userId,
          firstName: instructor.firstName,
          lastName: instructor.lastName,
          email: instructor.email,
          phone: instructor.phone,
          employeeId: instructor.employeeId,
          specialties: instructor.specialties.join(", "),
          bio: instructor.bio,
          status: instructor.status,
          notes: instructor.notes,
        });
        await reloadRelated();
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load instructor.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [instructorId, isNew]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError(null);
  }

  function buildProfilePayload() {
    return {
      ...form,
      specialties: form.specialties
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = buildProfilePayload();
      if (isNew) {
        const id = await createInstructor(payload);
        navigate(`/admin/instructors/${id}`);
      } else {
        await updateInstructor(instructorId, payload);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save instructor.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!instructorId || !window.confirm("Deactivate this instructor?")) return;
    setSaving(true);
    try {
      await deactivateInstructor(instructorId);
      navigate("/admin/instructors");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deactivate instructor.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCredential(event) {
    event.preventDefault();
    if (!instructorId) return;
    setSaving(true);
    setError(null);
    try {
      await createInstructorCertification({ ...credentialForm, instructorId });
      setCredentialForm(emptyCredential);
      await reloadRelated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add credential.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddAvailability(event) {
    event.preventDefault();
    if (!instructorId) return;
    setSaving(true);
    setError(null);
    try {
      await createInstructorAvailability({ ...availabilityForm, instructorId });
      setAvailabilityForm(emptyAvailability);
      await reloadRelated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add availability.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignClass(event) {
    event.preventDefault();
    if (!instructorId || !assignClassId || !user?.uid) return;
    setSaving(true);
    setError(null);
    try {
      await assignInstructorToClass({
        instructorId,
        classId: assignClassId,
        assignmentRole: assignRole,
        assignedByUid: user.uid,
      });
      setAssignClassId("");
      await reloadRelated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to assign instructor.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddEvaluation(event) {
    event.preventDefault();
    if (!instructorId) return;
    setSaving(true);
    setError(null);
    try {
      await createInstructorEvaluation({
        instructorId,
        classId: evaluationForm.classId,
        studentName: evaluationForm.studentName,
        rating: Number(evaluationForm.rating),
        comments: evaluationForm.comments,
        sessionDate: evaluationForm.sessionDate,
      });
      setEvaluationForm({
        classId: "",
        studentName: "",
        rating: "5",
        comments: "",
        sessionDate: "",
      });
      await reloadRelated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add evaluation.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="grid flex-1 place-items-center text-[var(--color-afta-subtle)]">Loading instructor…</div>;
  }

  return (
    <>
      <PageHeader
        title={isNew ? "Add Instructor" : `${form.firstName} ${form.lastName}`.trim() || "Instructor"}
        subtitle="Profile, credentials, availability, assignments, and evaluations"
        actions={
          <Link
            to="/admin/instructors"
            className="app-btn-secondary px-4 py-2 text-xs"
          >
            Back to instructors
          </Link>
        }
      />

      <form className="flex flex-1 flex-col gap-5 p-6 lg:p-7" onSubmit={handleSubmit}>
        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <FormSection title="Instructor profile">
          <FormField label="First name" name="firstName" value={form.firstName} onChange={handleChange} required />
          <FormField label="Last name" name="lastName" value={form.lastName} onChange={handleChange} required />
          <FormField label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
          <FormField label="Phone" name="phone" value={form.phone} onChange={handleChange} />
          <FormField label="Employee ID" name="employeeId" value={form.employeeId} onChange={handleChange} />
          <FormSelect
            label="Portal user link"
            name="userId"
            value={form.userId}
            onChange={handleChange}
            options={[
              { value: "", label: "No linked login" },
              ...portalUsers.map((portalUser) => ({
                value: portalUser.uid,
                label: `${portalUser.displayName} · ${portalUser.email}`,
              })),
            ]}
          />
          <FormField
            label="Specialties"
            name="specialties"
            value={form.specialties}
            onChange={handleChange}
            hint="Comma-separated (e.g. Live Fire, HazMat, Instructor I)"
          />
          <FormSelect
            label="Status"
            name="status"
            value={form.status}
            onChange={handleChange}
            options={Object.entries(INSTRUCTOR_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </FormSection>

        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
          <FormTextarea label="Bio" name="bio" value={form.bio} onChange={handleChange} />
        </section>

        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
          <FormTextarea label="Notes" name="notes" value={form.notes} onChange={handleChange} />
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-[10px] bg-[#c8102e] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : isNew ? "Create instructor" : "Save profile"}
          </button>
          {!isNew && form.status !== INSTRUCTOR_STATUSES.INACTIVE ? (
            <button
              type="button"
              disabled={saving}
              onClick={handleDeactivate}
              className="rounded-[10px] border border-[var(--color-afta-border)] px-5 py-2.5 text-sm font-semibold text-[var(--color-afta-subtle)]"
            >
              Deactivate
            </button>
          ) : null}
        </div>
      </form>

      {!isNew ? (
        <div className="flex flex-col gap-5 px-6 pb-7 lg:px-7">
          <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
            <h2 className="mb-4 text-sm font-semibold text-[var(--color-afta-text)]">Credentials</h2>
            {certifications.length === 0 ? (
              <p className="mb-4 text-sm text-[var(--color-afta-subtle)]">No credentials tracked yet.</p>
            ) : (
              <div className="mb-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                      <th className="px-3 py-2">Credential</th>
                      <th className="px-3 py-2">Expires</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certifications.map((cert) => (
                      <tr key={cert.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                        <td className="px-3 py-2">{cert.name}</td>
                        <td className="px-3 py-2">{cert.expirationDate || "—"}</td>
                        <td className="px-3 py-2">{CREDENTIAL_STATUS_LABELS[cert.status]}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => deleteInstructorCertification(cert.id).then(reloadRelated)}
                            className="text-xs text-[#c8102e]"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <form className="grid gap-3 md:grid-cols-2" onSubmit={handleAddCredential}>
              <FormField label="Credential name" name="name" value={credentialForm.name} onChange={(event) => setCredentialForm({ ...credentialForm, name: event.target.value })} required />
              <FormField label="Credential number" name="credentialNumber" value={credentialForm.credentialNumber} onChange={(event) => setCredentialForm({ ...credentialForm, credentialNumber: event.target.value })} />
              <FormField label="Issuing body" name="issuingBody" value={credentialForm.issuingBody} onChange={(event) => setCredentialForm({ ...credentialForm, issuingBody: event.target.value })} />
              <FormField label="Issued date" name="issuedDate" type="date" value={credentialForm.issuedDate} onChange={(event) => setCredentialForm({ ...credentialForm, issuedDate: event.target.value })} />
              <FormField label="Expiration date" name="expirationDate" type="date" value={credentialForm.expirationDate} onChange={(event) => setCredentialForm({ ...credentialForm, expirationDate: event.target.value })} />
              <button type="submit" disabled={saving} className="self-end rounded-[10px] bg-white px-4 py-2 text-xs font-semibold text-[var(--color-afta-text)]">
                Add credential
              </button>
            </form>
          </section>

          <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
            <h2 className="mb-4 text-sm font-semibold text-[var(--color-afta-text)]">Availability</h2>
            {availability.length === 0 ? (
              <p className="mb-4 text-sm text-[var(--color-afta-subtle)]">No availability blocks recorded.</p>
            ) : (
              <ul className="mb-4 space-y-2 text-sm text-[var(--color-afta-text)]">
                {availability.map((row) => (
                  <li key={row.id} className="flex items-center justify-between rounded-[10px] border border-[var(--color-afta-border)] px-3 py-2">
                    <span>
                      {row.startDate} – {row.endDate} · {AVAILABILITY_TYPE_LABELS[row.availabilityType]}
                    </span>
                    <button type="button" onClick={() => deleteInstructorAvailability(row.id).then(reloadRelated)} className="text-xs text-[#c8102e]">
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form className="grid gap-3 md:grid-cols-2" onSubmit={handleAddAvailability}>
              <FormField label="Start date" name="startDate" type="date" value={availabilityForm.startDate} onChange={(event) => setAvailabilityForm({ ...availabilityForm, startDate: event.target.value })} required />
              <FormField label="End date" name="endDate" type="date" value={availabilityForm.endDate} onChange={(event) => setAvailabilityForm({ ...availabilityForm, endDate: event.target.value })} required />
              <FormSelect label="Type" name="availabilityType" value={availabilityForm.availabilityType} onChange={(event) => setAvailabilityForm({ ...availabilityForm, availabilityType: event.target.value })} options={Object.entries(AVAILABILITY_TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
              <button type="submit" disabled={saving} className="self-end rounded-[10px] bg-white px-4 py-2 text-xs font-semibold text-[var(--color-afta-text)]">
                Add availability
              </button>
            </form>
          </section>

          <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
            <h2 className="mb-4 text-sm font-semibold text-[var(--color-afta-text)]">Class assignments</h2>
            {assignments.length === 0 ? (
              <p className="mb-4 text-sm text-[var(--color-afta-subtle)]">No class assignments yet.</p>
            ) : (
              <div className="mb-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                      <th className="px-3 py-2">Course</th>
                      <th className="px-3 py-2">Dates</th>
                      <th className="px-3 py-2">Role</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((assignment) => (
                      <tr key={assignment.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                        <td className="px-3 py-2">{assignment.courseName}</td>
                        <td className="px-3 py-2">{assignment.startDate} – {assignment.endDate}</td>
                        <td className="px-3 py-2">{ASSIGNMENT_ROLE_LABELS[assignment.assignmentRole]}</td>
                        <td className="px-3 py-2">{ASSIGNMENT_STATUS_LABELS[assignment.status]}</td>
                        <td className="px-3 py-2">
                          {assignment.status === "scheduled" ? (
                            <button type="button" onClick={() => cancelInstructorAssignment(assignment.id).then(reloadRelated)} className="text-xs text-[#c8102e]">
                              Cancel
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <form className="grid gap-3 md:grid-cols-3" onSubmit={handleAssignClass}>
              <FormSelect
                label="Class session"
                name="assignClassId"
                value={assignClassId}
                onChange={(event) => setAssignClassId(event.target.value)}
                options={[
                  { value: "", label: "Select class" },
                  ...classes.map((session) => ({
                    value: session.id,
                    label: `${session.courseNumber} · ${session.startDate}`,
                  })),
                ]}
              />
              <FormSelect
                label="Assignment role"
                name="assignRole"
                value={assignRole}
                onChange={(event) => setAssignRole(event.target.value)}
                options={Object.entries(ASSIGNMENT_ROLE_LABELS).map(([value, label]) => ({ value, label }))}
              />
              <button type="submit" disabled={saving || !assignClassId} className="self-end rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
                Assign to class
              </button>
            </form>
          </section>

          <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
            <h2 className="mb-1 text-sm font-semibold text-[var(--color-afta-text)]">Student evaluations</h2>
            <p className="mb-4 text-sm text-[var(--color-afta-subtle)]">
              Average rating: {averageEvaluationRating(evaluations) || "—"}
            </p>
            {evaluations.length ? (
              <ul className="mb-4 space-y-2 text-sm text-[var(--color-afta-text)]">
                {evaluations.slice(0, 5).map((evaluation) => (
                  <li key={evaluation.id} className="rounded-[10px] border border-[var(--color-afta-border)] px-3 py-2">
                    {evaluation.rating}/5 · {evaluation.studentName || "Student"} · {evaluation.sessionDate}
                  </li>
                ))}
              </ul>
            ) : null}
            <form className="grid gap-3 md:grid-cols-2" onSubmit={handleAddEvaluation}>
              <FormSelect
                label="Class"
                name="classId"
                value={evaluationForm.classId}
                onChange={(event) => setEvaluationForm({ ...evaluationForm, classId: event.target.value })}
                options={[
                  { value: "", label: "Select class" },
                  ...assignments.map((assignment) => ({
                    value: assignment.classId,
                    label: assignment.courseName,
                  })),
                ]}
              />
              <FormField label="Student name" name="studentName" value={evaluationForm.studentName} onChange={(event) => setEvaluationForm({ ...evaluationForm, studentName: event.target.value })} />
              <FormField label="Rating (1-5)" name="rating" type="number" value={evaluationForm.rating} onChange={(event) => setEvaluationForm({ ...evaluationForm, rating: event.target.value })} />
              <FormField label="Session date" name="sessionDate" type="date" value={evaluationForm.sessionDate} onChange={(event) => setEvaluationForm({ ...evaluationForm, sessionDate: event.target.value })} />
              <FormTextarea label="Comments" name="comments" value={evaluationForm.comments} onChange={(event) => setEvaluationForm({ ...evaluationForm, comments: event.target.value })} />
              <button type="submit" disabled={saving} className="self-end rounded-[10px] bg-white px-4 py-2 text-xs font-semibold text-[var(--color-afta-text)]">
                Add evaluation
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
