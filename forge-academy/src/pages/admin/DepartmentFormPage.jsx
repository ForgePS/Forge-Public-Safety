import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField, FormSection, FormSelect } from "../../components/StudentFormFields.jsx";
import {
  DEPARTMENT_STATUSES,
  createDepartment,
  deactivateDepartment,
  getDepartment,
  updateDepartment,
} from "../../lib/departments.js";

const emptyForm = {
  name: "",
  fdid: "",
  address: "",
  city: "",
  state: "AR",
  zip: "",
  county: "",
  region: "",
  departmentType: "",
  chiefName: "",
  chiefEmail: "",
  chiefPhone: "",
  trainingOfficerName: "",
  trainingOfficerEmail: "",
  trainingOfficerPhone: "",
  status: DEPARTMENT_STATUSES.ACTIVE,
};

export default function DepartmentFormPage() {
  const { departmentId } = useParams();
  const isNew = !departmentId;
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isNew) return;

    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const department = await getDepartment(departmentId);
        if (!department) throw new Error("Department not found.");
        if (active) {
          setForm({
            name: department.name,
            fdid: department.fdid,
            address: department.address,
            city: department.city,
            state: department.state,
            zip: department.zip,
            county: department.county,
            region: department.region,
            departmentType: department.departmentType,
            chiefName: department.chiefName,
            chiefEmail: department.chiefEmail,
            chiefPhone: department.chiefPhone,
            trainingOfficerName: department.trainingOfficerName,
            trainingOfficerEmail: department.trainingOfficerEmail,
            trainingOfficerPhone: department.trainingOfficerPhone,
            status: department.status,
          });
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load department.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [departmentId, isNew]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (isNew) {
        const id = await createDepartment(form);
        navigate(`/admin/departments/${id}`);
      } else {
        await updateDepartment(departmentId, form);
        navigate("/admin/departments");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save department.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!departmentId || !window.confirm("Mark this department as inactive?")) return;

    setSaving(true);
    setError(null);
    try {
      await deactivateDepartment(departmentId);
      navigate("/admin/departments");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deactivate department.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="grid flex-1 place-items-center text-[var(--color-afta-subtle)]">Loading department…</div>
    );
  }

  return (
    <>
      <PageHeader
        title={isNew ? "Add Department" : "Edit Department"}
        subtitle={isNew ? "Create a fire department profile" : form.fdid}
        actions={
          <div className="flex flex-wrap gap-2">
            {!isNew ? (
              <Link
                to={`/admin/departments/${departmentId}/roster`}
                className="app-btn-secondary px-4 py-2 text-xs"
              >
                View roster
              </Link>
            ) : null}
            <Link
              to="/admin/departments"
              className="app-btn-secondary px-4 py-2 text-xs"
            >
              Back to list
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

        <FormSection title="Department profile">
          <FormField label="Department name" name="name" value={form.name} onChange={handleChange} required />
          <FormField
            label="FDID"
            name="fdid"
            value={form.fdid}
            onChange={handleChange}
            required
            hint="Fire department identification number"
          />
          <FormField label="County" name="county" value={form.county} onChange={handleChange} required />
          <FormField
            label="Department type"
            name="departmentType"
            value={form.departmentType}
            onChange={handleChange}
            hint="Career, volunteer, mostly volunteer, etc."
          />
          <FormField label="Region" name="region" value={form.region} onChange={handleChange} />
          <FormSelect
            label="Status"
            name="status"
            value={form.status}
            onChange={handleChange}
            options={[
              { value: DEPARTMENT_STATUSES.ACTIVE, label: "Active" },
              { value: DEPARTMENT_STATUSES.INACTIVE, label: "Inactive" },
            ]}
          />
        </FormSection>

        <FormSection title="Location">
          <FormField label="Address" name="address" value={form.address} onChange={handleChange} />
          <FormField label="City" name="city" value={form.city} onChange={handleChange} />
          <FormField label="State" name="state" value={form.state} onChange={handleChange} />
          <FormField label="ZIP" name="zip" value={form.zip} onChange={handleChange} />
        </FormSection>

        <FormSection title="Chief contact">
          <FormField label="Chief name" name="chiefName" value={form.chiefName} onChange={handleChange} />
          <FormField label="Chief email" name="chiefEmail" type="email" value={form.chiefEmail} onChange={handleChange} />
          <FormField label="Chief phone" name="chiefPhone" type="tel" value={form.chiefPhone} onChange={handleChange} />
        </FormSection>

        <FormSection title="Training officer contact">
          <FormField
            label="Training officer name"
            name="trainingOfficerName"
            value={form.trainingOfficerName}
            onChange={handleChange}
          />
          <FormField
            label="Training officer email"
            name="trainingOfficerEmail"
            type="email"
            value={form.trainingOfficerEmail}
            onChange={handleChange}
          />
          <FormField
            label="Training officer phone"
            name="trainingOfficerPhone"
            type="tel"
            value={form.trainingOfficerPhone}
            onChange={handleChange}
          />
        </FormSection>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-[10px] bg-[#c8102e] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : isNew ? "Create department" : "Save changes"}
          </button>

          {!isNew && form.status === DEPARTMENT_STATUSES.ACTIVE ? (
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
