import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField, FormSection, FormSelect } from "../../components/StudentFormFields.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { listActiveDepartments } from "../../lib/departments.js";
import { listInstructors, instructorDisplayName } from "../../lib/instructors.js";
import {
  createPortalUser,
  generateTempPassword,
  getPortalUserErrorMessage,
  resetPortalUserPassword,
  updatePortalUser,
} from "../../lib/portalUsers.js";
import { ALL_ROLES, ROLE_LABELS, ROLES, isSystemSettingsAdmin } from "../../lib/roles.js";
import { listStudents } from "../../lib/students.js";
import { fetchUserProfile } from "../../lib/users.js";
import DigitalDashboardPermissionsEditor from "../../components/digitalDashboard/DigitalDashboardPermissionsEditor.jsx";
import {
  createEmptyDigitalDashboardPermissions,
  hasCustomDigitalDashboardPermissions,
  normalizeDigitalDashboardPermissions,
  serializeDigitalDashboardPermissions,
} from "../../lib/digitalDashboardPermissions.js";

const emptyForm = {
  email: "",
  password: "",
  displayName: "",
  role: ROLES.STUDENT,
  departmentId: "",
  studentId: "",
  instructorId: "",
  createInstructorProfile: true,
  disabled: false,
};

export default function UserFormPage() {
  const { userId } = useParams();
  const isNew = !userId;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: currentUser } = useAuth();

  const [form, setForm] = useState(() => ({
    ...emptyForm,
    email: searchParams.get("email") ?? "",
    displayName: searchParams.get("displayName") ?? "",
    role: searchParams.get("role") ?? ROLES.STUDENT,
    departmentId: searchParams.get("departmentId") ?? "",
    studentId: searchParams.get("studentId") ?? "",
    instructorId: searchParams.get("instructorId") ?? "",
  }));
  const [passwordReset, setPasswordReset] = useState("");
  const [departments, setDepartments] = useState([]);
  const [students, setStudents] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [useCustomDigitalDashboardPermissions, setUseCustomDigitalDashboardPermissions] = useState(false);
  const [digitalDashboardPermissions, setDigitalDashboardPermissions] = useState(() =>
    createEmptyDigitalDashboardPermissions(),
  );

  const canManageDigitalDashboardPermissions = isSystemSettingsAdmin(currentUser?.role);
  const showDigitalDashboardPermissions =
    canManageDigitalDashboardPermissions &&
    (form.role === ROLES.ACADEMY_ADMIN || form.role === ROLES.SUPER_ADMIN);

  const roleOptions = useMemo(
    () =>
      ALL_ROLES.filter((role) => {
        if (role === ROLES.CREATOR) return currentUser?.role === ROLES.CREATOR;
        if (role === ROLES.SUPER_ADMIN) {
          return currentUser?.role === ROLES.SUPER_ADMIN || currentUser?.role === ROLES.CREATOR;
        }
        return true;
      }).map((role) => ({
        value: role,
        label: ROLE_LABELS[role],
      })),
    [currentUser?.role],
  );

  useEffect(() => {
    let active = true;

    async function loadLookups() {
      try {
        const [departmentRows, studentRows, instructorRows] = await Promise.all([
          listActiveDepartments(),
          listStudents(),
          listInstructors(),
        ]);
        if (!active) return;
        setDepartments(departmentRows);
        setStudents(studentRows);
        setInstructors(instructorRows);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load form options.");
        }
      }
    }

    loadLookups();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isNew) return;

    let active = true;

    async function loadUser() {
      setLoading(true);
      setError(null);
      try {
        const portalUser = await fetchUserProfile(userId);
        if (!portalUser) throw new Error("Portal user not found.");
        if (!active) return;
        setForm({
          email: portalUser.email,
          password: "",
          displayName: portalUser.displayName,
          role: portalUser.role,
          departmentId: portalUser.departmentId ?? "",
          studentId: portalUser.studentId ?? "",
          instructorId: "",
          createInstructorProfile: false,
          disabled: Boolean(portalUser.disabled),
        });
        const customPermissions = hasCustomDigitalDashboardPermissions(portalUser);
        setUseCustomDigitalDashboardPermissions(customPermissions);
        setDigitalDashboardPermissions(
          customPermissions
            ? normalizeDigitalDashboardPermissions(portalUser.permissions.digitalDashboard)
            : createEmptyDigitalDashboardPermissions(),
        );
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load portal user.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadUser();
    return () => {
      active = false;
    };
  }, [isNew, userId]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError(null);
    setSuccess(null);
  }

  function handleGeneratePassword() {
    setForm((current) => ({ ...current, password: generateTempPassword() }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const permissionsPayload = showDigitalDashboardPermissions
        ? useCustomDigitalDashboardPermissions
          ? { digitalDashboard: serializeDigitalDashboardPermissions(digitalDashboardPermissions) }
          : null
        : undefined;

      if (isNew) {
        const result = await createPortalUser({
          email: form.email,
          password: form.password,
          displayName: form.displayName,
          role: form.role,
          departmentId: form.departmentId,
          studentId: form.studentId,
          instructorId: form.instructorId,
          createInstructorProfile: form.createInstructorProfile,
          permissions: permissionsPayload,
        });
        navigate(`/admin/users/${result.uid}`);
        return;
      }

      await updatePortalUser({
        uid: userId,
        displayName: form.displayName,
        role: form.role,
        departmentId: form.departmentId,
        studentId: form.studentId,
        instructorId: form.instructorId,
        disabled: form.disabled,
        permissions: permissionsPayload,
      });
      setSuccess("Portal user updated.");
    } catch (err) {
      setError(getPortalUserErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    if (!passwordReset || passwordReset.length < 8) {
      setError("Enter a new password with at least 8 characters.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await resetPortalUserPassword({ uid: userId, password: passwordReset });
      setPasswordReset("");
      setSuccess("Password reset successfully.");
    } catch (err) {
      setError(getPortalUserErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-7 text-sm text-[var(--color-afta-subtle)]">Loading portal user…</div>
    );
  }

  return (
    <>
      <PageHeader
        title={isNew ? "Add Portal User" : "Edit Portal User"}
        subtitle="Creates Firebase Auth login credentials and a role profile"
        actions={
          <Link
            to="/admin/users"
            className="app-btn-secondary px-4 py-2 text-xs"
          >
            Back to list
          </Link>
        }
      />

      <form className="flex flex-1 flex-col gap-5 p-6 lg:p-7" onSubmit={handleSubmit}>
        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-[10px] border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
            {success}
          </p>
        ) : null}

        <FormSection title="Account">
          {isNew ? (
            <FormField
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          ) : (
            <FormField label="Email" name="email" value={form.email} onChange={() => {}} disabled />
          )}

          <FormField
            label="Display name"
            name="displayName"
            value={form.displayName}
            onChange={handleChange}
            required
          />

          <FormSelect
            label="Portal role"
            name="role"
            value={form.role}
            onChange={handleChange}
            options={roleOptions}
          />

          {isNew ? (
            <div>
              <FormField
                label="Temporary password"
                name="password"
                type="text"
                value={form.password}
                onChange={handleChange}
                required
                hint="Share this with the user. They should change it after first sign-in."
              />
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="mt-2 rounded-[10px] border border-[var(--color-afta-border)] px-3 py-2 text-xs font-semibold text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)]"
              >
                Generate password
              </button>
            </div>
          ) : (
            <FormSelect
              label="Account status"
              name="disabled"
              value={form.disabled ? "disabled" : "active"}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  disabled: event.target.value === "disabled",
                }))
              }
              options={[
                { value: "active", label: "Active" },
                { value: "disabled", label: "Disabled" },
              ]}
            />
          )}
        </FormSection>

        <FormSection title="Role links">
          {form.role === ROLES.DEPARTMENT ? (
            <FormSelect
              label="Department"
              name="departmentId"
              value={form.departmentId}
              onChange={handleChange}
              required
              options={[
                { value: "", label: "Select department…" },
                ...departments.map((department) => ({
                  value: department.id,
                  label: `${department.name} (${department.fdid})`,
                })),
              ]}
            />
          ) : null}

          {form.role === ROLES.STUDENT ? (
            <FormSelect
              label="Student record"
              name="studentId"
              value={form.studentId}
              onChange={handleChange}
              required
              options={[
                { value: "", label: "Select student…" },
                ...students.map((student) => ({
                  value: student.id,
                  label: `${student.firstName} ${student.lastName} · ${student.email || "no email"}`,
                })),
              ]}
            />
          ) : null}

          {form.role === ROLES.INSTRUCTOR ? (
            <>
              <FormSelect
                label="Link existing instructor profile"
                name="instructorId"
                value={form.instructorId}
                onChange={handleChange}
                options={[
                  { value: "", label: "No existing profile" },
                  ...instructors
                    .filter((instructor) => !instructor.userId || instructor.userId === userId)
                    .map((instructor) => ({
                      value: instructor.id,
                      label: instructorDisplayName(instructor),
                    })),
                ]}
              />
              {isNew && !form.instructorId ? (
                <label className="flex items-center gap-2 text-sm text-[var(--color-afta-subtle)]">
                  <input
                    type="checkbox"
                    name="createInstructorProfile"
                    checked={form.createInstructorProfile}
                    onChange={handleChange}
                  />
                  Create a matching instructor profile automatically
                </label>
              ) : null}
            </>
          ) : null}

          {form.role === ROLES.ACADEMY_ADMIN || form.role === ROLES.CERTIFICATION_OFFICER ? (
            <p className="text-sm text-[var(--color-afta-subtle)]">
              No additional record link is required for this role.
            </p>
          ) : null}
        </FormSection>

        {showDigitalDashboardPermissions ? (
          <FormSection title="Digital Dashboard permissions">
            <p className="text-sm text-[var(--color-afta-subtle)]">
              Control which Digital Dashboard sections this user can view or edit. Leave unchecked to grant full Digital Dashboard access for academy admins.
            </p>
            <label className="flex items-center gap-2 text-sm text-[var(--color-afta-text)]">
              <input
                type="checkbox"
                checked={useCustomDigitalDashboardPermissions}
                onChange={(event) => setUseCustomDigitalDashboardPermissions(event.target.checked)}
              />
              Use custom section permissions
            </label>
            {useCustomDigitalDashboardPermissions ? (
              <DigitalDashboardPermissionsEditor
                value={digitalDashboardPermissions}
                onChange={setDigitalDashboardPermissions}
              />
            ) : null}
          </FormSection>
        ) : null}

        {!isNew ? (
          <FormSection title="Reset password">
            <FormField
              label="New password"
              name="passwordReset"
              type="text"
              value={passwordReset}
              onChange={(event) => setPasswordReset(event.target.value)}
              hint="Leave blank unless resetting the user's password."
            />
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={saving}
              className="app-btn-secondary px-4 py-2 text-xs disabled:opacity-60"
            >
              Reset password
            </button>
          </FormSection>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-[10px] bg-[#c8102e] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : isNew ? "Create portal user" : "Save changes"}
          </button>
          <Link
            to="/admin/users"
            className="rounded-[10px] border border-[var(--color-afta-border)] px-5 py-2.5 text-sm font-semibold text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
