import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField, FormSection } from "../../components/StudentFormFields.jsx";
import {
  createCertificationType,
  listCertificationTypes,
} from "../../lib/certificationTypes.js";

export default function AdminCertificationTypesPage() {
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({ name: "", code: "", description: "", validityYears: "2" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function reload() {
    setTypes(await listCertificationTypes());
  }

  useEffect(() => {
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load types."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createCertificationType({
        name: form.name,
        code: form.code,
        description: form.description,
        validityYears: Number(form.validityYears),
        status: "active",
      });
      setForm({ name: "", code: "", description: "", validityYears: "2" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create certification type.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Certification Types"
        subtitle="Credential definitions and validity periods"
        actions={
          <Link
            to="/admin/certifications"
            className="app-btn-secondary px-4 py-2 text-xs"
          >
            All certifications
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
          <FormSection title="New certification type">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Name" name="name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
              <FormField label="Code" name="code" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} required hint="Matches course certification type field" />
              <FormField label="Validity (years)" name="validityYears" value={form.validityYears} onChange={(e) => setForm((p) => ({ ...p, validityYears: e.target.value }))} />
              <FormField label="Description" name="description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </FormSection>
          <button type="submit" disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
            <Plus className="h-4 w-4" />
            Add type
          </button>
        </form>

        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Validity</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">Loading…</td></tr>
                ) : types.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">No certification types yet.</td></tr>
                ) : (
                  types.map((type) => (
                    <tr key={type.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                      <td className="px-4 py-3 text-[var(--color-afta-text)]">{type.name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{type.code}</td>
                      <td className="px-4 py-3">{type.validityYears} years</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
