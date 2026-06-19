import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import StudentProfilePhoto from "../../components/StudentProfilePhoto.jsx";
import {
  DuplicateAlert,
  FormField,
  FormSection,
  FormSelect,
  FormTextarea,
} from "../../components/StudentFormFields.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { listActiveDepartments } from "../../lib/departments.js";
import { ROLES } from "../../lib/roles.js";
import {
  DuplicateStudentError,
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_STATUS_LABELS,
  STUDENT_STATUSES,
  createStudent,
  deactivateStudent,
  findByFemaSid,
  findDuplicateMatches,
  getStudent,
  updateStudent,
} from "../../lib/students.js";

const emptyForm = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  email: "",
  phone: "",
  femaSid: "",
  departmentId: "",
  departmentName: "",
  rank: "",
  employmentStatus: EMPLOYMENT_STATUSES.CAREER,
  emsLicense: "",
  status: STUDENT_STATUSES.ACTIVE,
  notes: "",
  mailingAddressLine1: "",
  mailingAddressLine2: "",
  mailingCity: "",
  mailingState: "",
  mailingZip: "",
  emergencyContactName: "",
  emergencyContactRelationship: "",
  emergencyContactPhone: "",
  emergencyContactAddressLine1: "",
  emergencyContactCity: "",
  emergencyContactState: "",
  emergencyContactZip: "",
  specialConsiderations: "",
};

export default function StudentFormPage() {
  const { studentId } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = !studentId;
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState(emptyForm);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [duplicateMatches, setDuplicateMatches] = useState([]);
  const [profilePictureUrl, setProfilePictureUrl] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDepartments() {
      try {
        const data = await listActiveDepartments();
        if (!active) return;
        setDepartments(data);

        const presetId = searchParams.get("departmentId");
        if (isNew && presetId) {
          const preset = data.find((department) => department.id === presetId);
          if (preset) {
            setForm((current) => ({
              ...current,
              departmentId: preset.id,
              departmentName: preset.name,
            }));
          }
        }
      } catch {
        // Department list failure should not block the form.
      }
    }

    loadDepartments();
    return () => {
      active = false;
    };
  }, [isNew, searchParams]);

  useEffect(() => {
    if (isNew) return;

    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const student = await getStudent(studentId);
        if (!student) {
          throw new Error("Student not found.");
        }
        if (active) {
          setForm({
            firstName: student.firstName,
            lastName: student.lastName,
            dateOfBirth: student.dateOfBirth,
            email: student.email,
            phone: student.phone,
            femaSid: student.femaSid,
            departmentId: student.departmentId,
            departmentName: student.departmentName,
            rank: student.rank,
            employmentStatus: student.employmentStatus,
            emsLicense: student.emsLicense,
            status: student.status,
            notes: student.notes,
            mailingAddressLine1: student.mailingAddressLine1,
            mailingAddressLine2: student.mailingAddressLine2,
            mailingCity: student.mailingCity,
            mailingState: student.mailingState,
            mailingZip: student.mailingZip,
            emergencyContactName: student.emergencyContactName,
            emergencyContactRelationship: student.emergencyContactRelationship,
            emergencyContactPhone: student.emergencyContactPhone,
            emergencyContactAddressLine1: student.emergencyContactAddressLine1,
            emergencyContactCity: student.emergencyContactCity,
            emergencyContactState: student.emergencyContactState,
            emergencyContactZip: student.emergencyContactZip,
            specialConsiderations: student.specialConsiderations,
          });
          setProfilePictureUrl(student.profilePictureUrl ?? "");
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load student.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [isNew, studentId]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setDuplicateMatches([]);
    setError(null);
  }

  function handleDepartmentChange(event) {
    const departmentId = event.target.value;
    const department = departments.find((item) => item.id === departmentId);
    setForm((current) => ({
      ...current,
      departmentId,
      departmentName: department?.name ?? "",
    }));
    setDuplicateMatches([]);
    setError(null);
  }

  async function handleFemaSidBlur() {
    if (!form.femaSid) return;
    try {
      const sidMatches = await findByFemaSid(form.femaSid, studentId);
      if (sidMatches.length) {
        setDuplicateMatches(
          sidMatches.map((student) => ({ student, reasons: ["FEMA SID"] })),
        );
        return;
      }

      const matches = await findDuplicateMatches(form, studentId);
      setDuplicateMatches(matches);
    } catch {
      // Non-blocking lookup errors can be ignored on blur.
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setDuplicateMatches([]);

    try {
      if (isNew) {
        const id = await createStudent(form, user?.uid ?? "unknown");
        navigate(`/admin/students/${id}`);
      } else {
        await updateStudent(studentId, form);
        navigate("/admin/students");
      }
    } catch (err) {
      if (err instanceof DuplicateStudentError) {
        setDuplicateMatches(err.matches);
      } else {
        setError(err instanceof Error ? err.message : "Unable to save student.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!studentId || !window.confirm("Mark this student as inactive?")) return;

    setSaving(true);
    setError(null);
    try {
      await deactivateStudent(studentId);
      navigate("/admin/students");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deactivate student.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="grid flex-1 place-items-center text-[var(--color-afta-subtle)]">Loading student record…</div>
    );
  }

  return (
    <>
      <PageHeader
        title={isNew ? "Add Student" : "Edit Student"}
        subtitle={isNew ? "Create a permanent training record" : form.femaSid}
        actions={
          <div className="flex flex-wrap gap-2">
            {!isNew ? (
              <Link
                to={`/admin/users/new?role=${ROLES.STUDENT}&studentId=${studentId}&email=${encodeURIComponent(form.email)}&displayName=${encodeURIComponent(`${form.firstName} ${form.lastName}`.trim())}`}
                className="app-btn-secondary px-4 py-2 text-xs"
              >
                Create portal account
              </Link>
            ) : null}
            {!isNew ? (
              <Link
                to={`/admin/certificates/new?studentId=${studentId}`}
                className="app-btn-secondary px-4 py-2 text-xs"
              >
                Issue certificate
              </Link>
            ) : null}
            {!isNew ? (
              <Link
                to={`/admin/students/${studentId}/transcript`}
                className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
              >
                View transcript
              </Link>
            ) : null}
            <Link
              to="/admin/students"
              className="app-btn-secondary px-4 py-2 text-xs"
            >
              Back to list
            </Link>
          </div>
        }
      />

      <form className="flex flex-1 flex-col gap-5 p-6 lg:p-7" onSubmit={handleSubmit}>
        <DuplicateAlert matches={duplicateMatches} />

        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-afta-text)]">Profile photo</h2>
          {!isNew ? (
            <StudentProfilePhoto
              studentId={studentId}
              profilePictureUrl={profilePictureUrl}
              displayName={`${form.lastName}, ${form.firstName}`}
              editable
              onPhotoChange={setProfilePictureUrl}
            />
          ) : (
            <p className="text-sm text-[var(--color-afta-subtle)]">
              Save the student record first, then upload a profile photo here or let the student
              upload one from their profile page.
            </p>
          )}
        </section>

        <FormSection title="Identity">
          <FormField
            label="First name"
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            required
          />
          <FormField
            label="Last name"
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            required
          />
          <FormField
            label="Date of birth"
            name="dateOfBirth"
            type="date"
            value={form.dateOfBirth}
            onChange={handleChange}
            required
          />
          <FormField
            label="FEMA SID"
            name="femaSid"
            value={form.femaSid}
            onChange={handleChange}
            onBlur={handleFemaSidBlur}
            required
            hint="9 to 12 digits · required for academy reporting"
          />
        </FormSection>

        <FormSection title="Contact">
          <FormField label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
          <FormField label="Phone" name="phone" type="tel" value={form.phone} onChange={handleChange} />
          <FormField
            label="EMS license"
            name="emsLicense"
            value={form.emsLicense}
            onChange={handleChange}
          />
          <FormSelect
            label="Record status"
            name="status"
            value={form.status}
            onChange={handleChange}
            options={[
              { value: STUDENT_STATUSES.ACTIVE, label: "Active" },
              { value: STUDENT_STATUSES.INACTIVE, label: "Inactive" },
            ]}
          />
        </FormSection>

        <FormSection title="Mailing address">
          <FormField
            label="Street address"
            name="mailingAddressLine1"
            value={form.mailingAddressLine1}
            onChange={handleChange}
          />
          <FormField
            label="Apt / suite / unit"
            name="mailingAddressLine2"
            value={form.mailingAddressLine2}
            onChange={handleChange}
          />
          <FormField label="City" name="mailingCity" value={form.mailingCity} onChange={handleChange} />
          <FormField label="State" name="mailingState" value={form.mailingState} onChange={handleChange} />
          <FormField label="ZIP code" name="mailingZip" value={form.mailingZip} onChange={handleChange} />
        </FormSection>

        <FormSection title="Emergency contact">
          <FormField
            label="Name"
            name="emergencyContactName"
            value={form.emergencyContactName}
            onChange={handleChange}
          />
          <FormField
            label="Relationship"
            name="emergencyContactRelationship"
            value={form.emergencyContactRelationship}
            onChange={handleChange}
          />
          <FormField
            label="Phone"
            name="emergencyContactPhone"
            type="tel"
            value={form.emergencyContactPhone}
            onChange={handleChange}
          />
          <FormField
            label="Street address"
            name="emergencyContactAddressLine1"
            value={form.emergencyContactAddressLine1}
            onChange={handleChange}
          />
          <FormField
            label="City"
            name="emergencyContactCity"
            value={form.emergencyContactCity}
            onChange={handleChange}
          />
          <FormField
            label="State"
            name="emergencyContactState"
            value={form.emergencyContactState}
            onChange={handleChange}
          />
          <FormField
            label="ZIP code"
            name="emergencyContactZip"
            value={form.emergencyContactZip}
            onChange={handleChange}
          />
        </FormSection>

        <FormSection title="Department">
          <FormSelect
            label="Department"
            name="departmentId"
            value={form.departmentId}
            onChange={handleDepartmentChange}
            options={[
              { value: "", label: "Select department" },
              ...departments.map((department) => ({
                value: department.id,
                label: `${department.name} · FDID ${department.fdid}`,
              })),
            ]}
          />
          <FormField label="Rank" name="rank" value={form.rank} onChange={handleChange} />
          <FormSelect
            label="Employment status"
            name="employmentStatus"
            value={form.employmentStatus}
            onChange={handleChange}
            options={Object.entries(EMPLOYMENT_STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </FormSection>

        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
          <FormTextarea
            label="Special considerations"
            name="specialConsiderations"
            value={form.specialConsiderations}
            onChange={handleChange}
          />
        </section>

        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
          <FormTextarea label="Admin notes" name="notes" value={form.notes} onChange={handleChange} />
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-[10px] bg-[#c8102e] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : isNew ? "Create student" : "Save changes"}
          </button>

          {!isNew && form.status === STUDENT_STATUSES.ACTIVE ? (
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
