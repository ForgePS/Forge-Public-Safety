import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField, FormSelect } from "../../components/StudentFormFields.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { usePortalRoles } from "../../context/PortalRolesContext.jsx";
import {
  PORTAL_TYPE_OPTIONS,
  archivePortalRoleDefinition,
  deletePortalRoleDefinition,
  listPortalRoleDefinitions,
  normalizeRoleId,
  savePortalRoleDefinition,
  validateCustomRoleId,
} from "../../lib/portalRoleDefinitions.js";
import {
  ALL_ROLES,
  ROLE_LABELS,
  canEditPortalRoleDefinition,
  canManageAdminPortalAccessRoles,
  canManagePortalAccessRoleType,
  canManagePortalRoleDefinitions,
} from "../../lib/roles.js";

const emptyForm = {
  roleId: "",
  label: "",
  description: "",
  portalType: "student",
};

export default function AdminPortalRolesPage() {
  const { user } = useAuth();
  const { reload: reloadAssignableRoles } = usePortalRoles();
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const canManage = canManagePortalRoleDefinitions(user?.role);
  const canManageAdminRoles = canManageAdminPortalAccessRoles(user?.role);

  const portalTypeOptions = useMemo(
    () =>
      canManageAdminRoles
        ? PORTAL_TYPE_OPTIONS
        : PORTAL_TYPE_OPTIONS.filter((option) => option.value !== "admin"),
    [canManageAdminRoles],
  );

  const editingRole = useMemo(
    () => roles.find((role) => role.id === editingId) ?? null,
    [roles, editingId],
  );

  const canSaveCurrentForm = canManagePortalAccessRoleType(user?.role, form.portalType)
    && (!editingRole || canEditPortalRoleDefinition(user?.role, editingRole));

  async function loadRoles() {
    setLoading(true);
    setError(null);
    try {
      const rows = await listPortalRoleDefinitions();
      setRoles(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load portal access roles.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRoles();
  }, []);

  const systemRoles = useMemo(
    () => ALL_ROLES.map((role) => ({ id: role, label: ROLE_LABELS[role], isSystem: true })),
    [],
  );

  function startCreate() {
    setEditingId("");
    setForm({
      ...emptyForm,
      portalType: portalTypeOptions[0]?.value ?? "student",
    });
    setSuccess(null);
    setError(null);
  }

  function startEdit(role) {
    if (!canEditPortalRoleDefinition(user?.role, role)) {
      setError("You do not have permission to edit that portal access role.");
      return;
    }
    setEditingId(role.id);
    setForm({
      roleId: role.id,
      label: role.label,
      description: role.description,
      portalType: role.portalType,
    });
    setSuccess(null);
    setError(null);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!user?.uid || !canSaveCurrentForm) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const roleId = editingId || validateCustomRoleId(form.roleId);
      if (!canManagePortalAccessRoleType(user.role, form.portalType)) {
        throw new Error("You do not have permission to create admin portal access roles.");
      }
      await savePortalRoleDefinition(
        roleId,
        {
          label: form.label,
          description: form.description,
          portalType: form.portalType,
          status: "active",
        },
        user.uid,
      );
      await loadRoles();
      await reloadAssignableRoles();
      setSuccess(editingId ? "Portal access role updated." : "Portal access role created.");
      if (!editingId) {
        setEditingId(roleId);
        setForm((current) => ({ ...current, roleId }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save portal access role.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(role) {
    if (!canEditPortalRoleDefinition(user?.role, role)) {
      setError("You do not have permission to archive that portal access role.");
      return;
    }
    if (!window.confirm(`Archive role "${role.id}"? Users keep the role but it won't appear for new assignments.`)) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await archivePortalRoleDefinition(role.id);
      await loadRoles();
      await reloadAssignableRoles();
      setSuccess(`Archived ${role.id}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to archive portal access role.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(role) {
    if (!canEditPortalRoleDefinition(user?.role, role)) {
      setError("You do not have permission to delete that portal access role.");
      return;
    }
    if (!window.confirm(`Delete role "${role.id}" permanently?`)) return;
    setSaving(true);
    setError(null);
    try {
      await deletePortalRoleDefinition(role.id);
      await loadRoles();
      await reloadAssignableRoles();
      if (editingId === role.id) startCreate();
      setSuccess(`Deleted ${role.id}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete portal access role.");
    } finally {
      setSaving(false);
    }
  }

  if (!canManage) {
    return (
      <PageHeader
        title="Access denied"
        subtitle="Academy admin access is required to manage user roles."
        backTo="/admin/users"
        backLabel="Back to portal users"
      />
    );
  }

  return (
    <>
      <PageHeader
        title="User Roles"
        subtitle="Create and edit custom roles, then assign them to portal users"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/portal-access" className="app-btn-secondary px-4 py-2 text-xs">
              Portal access
            </Link>
            <Link to="/admin/users" className="app-btn-secondary px-4 py-2 text-xs">
              Portal users
            </Link>
            <button type="button" onClick={startCreate} className="app-btn-primary px-4 py-2 text-xs">
              New user role
            </button>
          </div>
        }
      />

      {!canManageAdminRoles ? (
        <div className="mx-6 mt-4 rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 lg:mx-7">
          Academy admins can create student, instructor, department, and certification user roles.
          Creator or Super Admin access is required for admin portal roles.
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-5 p-6 lg:flex-row lg:p-7">
        <section className="app-panel min-w-0 flex-1 p-5">
          <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Built-in roles</h2>
          <p className="mt-1 text-sm text-[var(--color-afta-subtle)]">
            System roles are always available and cannot be edited here.
          </p>
          <ul className="mt-4 space-y-2">
            {systemRoles.map((role) => (
              <li
                key={role.id}
                className="rounded-[10px] border border-[var(--color-afta-border)] px-3 py-2 text-sm text-[var(--color-afta-text)]"
              >
                {role.label}
                <span className="ml-2 text-xs text-[var(--color-afta-muted)]">({role.id})</span>
              </li>
            ))}
          </ul>

          <h2 className="mt-8 text-sm font-semibold text-[var(--color-afta-text)]">Custom user roles</h2>
          {loading ? (
            <p className="mt-3 text-sm text-[var(--color-afta-subtle)]">Loading…</p>
          ) : roles.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--color-afta-subtle)]">No custom user roles yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase tracking-wide text-[var(--color-afta-muted)]">
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Portal access</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => {
                    const editable = canEditPortalRoleDefinition(user?.role, role);
                    return (
                      <tr key={role.id} className="border-b border-[var(--color-afta-border)]">
                        <td className="px-3 py-2">
                          <p className="font-medium">{role.label}</p>
                          <p className="text-xs text-[var(--color-afta-muted)]">{role.id}</p>
                        </td>
                        <td className="px-3 py-2">
                          {PORTAL_TYPE_OPTIONS.find((option) => option.value === role.portalType)?.label
                            ?? role.portalType}
                        </td>
                        <td className="px-3 py-2">{role.status}</td>
                        <td className="px-3 py-2">
                          {editable ? (
                            <div className="flex flex-wrap gap-2">
                              <button type="button" className="text-xs font-semibold text-[#c8102e]" onClick={() => startEdit(role)}>
                                Edit
                              </button>
                              {role.status === "active" ? (
                                <button type="button" className="text-xs text-[var(--color-afta-subtle)]" onClick={() => handleArchive(role)}>
                                  Archive
                                </button>
                              ) : null}
                              <button type="button" className="text-xs text-red-700" onClick={() => handleDelete(role)}>
                                Delete
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--color-afta-muted)]">Creator / Super Admin only</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="app-panel w-full shrink-0 p-5 lg:w-[24rem]">
          <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">
            {editingId ? "Edit portal access role" : "Create portal access role"}
          </h2>
          {error ? <p className="app-error mt-3">{error}</p> : null}
          {success ? (
            <p className="mt-3 rounded-[10px] border border-green-500/30 bg-green-50 px-3 py-2 text-sm text-green-800">
              {success}
            </p>
          ) : null}
          <form className="mt-4 space-y-4" onSubmit={handleSave}>
            <FormField
              label="Role id"
              name="roleId"
              value={form.roleId}
              onChange={handleChange}
              disabled={Boolean(editingId)}
              required
              hint="Lowercase slug, e.g. registrar or housing_manager"
            />
            <FormField label="Display name" name="label" value={form.label} onChange={handleChange} required />
            <FormField
              label="Description"
              name="description"
              value={form.description}
              onChange={handleChange}
            />
            <FormSelect
              label="Portal access"
              name="portalType"
              value={form.portalType}
              onChange={handleChange}
              options={portalTypeOptions}
              disabled={Boolean(editingId && editingRole?.portalType === "admin" && !canManageAdminRoles)}
            />
            <p className="text-xs text-[var(--color-afta-muted)]">
              Portal access controls which area users land in after sign-in. Student and department roles still need linked records on the user profile.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={saving || !canSaveCurrentForm} className="app-btn-primary px-4 py-2 text-xs disabled:opacity-60">
                {saving ? "Saving…" : editingId ? "Save role" : "Create role"}
              </button>
              {editingId ? (
                <button type="button" onClick={startCreate} className="app-btn-secondary px-4 py-2 text-xs">
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
          {form.roleId ? (
            <p className="mt-4 text-xs text-[var(--color-afta-subtle)]">
              Preview id: <code>{normalizeRoleId(form.roleId) || "—"}</code>
            </p>
          ) : null}
        </section>
      </div>
    </>
  );
}
