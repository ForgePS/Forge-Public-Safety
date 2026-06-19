import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField, FormSection } from "../../components/StudentFormFields.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  createTestCategory,
  listTestCategories,
  seedDefaultTestCategories,
  updateTestCategory,
} from "../../lib/testCategories.js";

export default function AdminTestCategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  async function reload() {
    setCategories(await listTestCategories(true));
  }

  useEffect(() => {
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load categories."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await createTestCategory(form, user.uid);
      setForm({ name: "", description: "" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create category.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSeedDefaults() {
    if (!user) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const created = await seedDefaultTestCategories(user.uid);
      setMessage(created ? `Added ${created} default categories.` : "Default categories already exist.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to seed categories.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(categoryId, active) {
    if (!user) return;
    await updateTestCategory(categoryId, { active: !active }, user.uid);
    await reload();
  }

  return (
    <>
      <PageHeader
        title="Test Categories"
        subtitle="Written, practical, certification, retest, and make-up exam types"
        actions={
          <Link to="/admin/testing" className="app-btn-secondary px-4 py-2 text-xs">
            Testing home
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="rounded-[10px] border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">{message}</p> : null}

        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={saving} onClick={handleSeedDefaults} className="app-btn-secondary px-4 py-2 text-xs disabled:opacity-60">
            Load default categories
          </button>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
          <FormSection title="New category">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Name" name="name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
              <FormField label="Description" name="description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </FormSection>
          <button type="submit" disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
            <Plus className="h-4 w-4" />
            Add category
          </button>
        </form>

        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">Loading…</td></tr>
                ) : categories.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">No categories yet.</td></tr>
                ) : (
                  categories.map((category) => (
                    <tr key={category.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                      <td className="px-4 py-3 text-[var(--color-afta-text)]">{category.name}</td>
                      <td className="px-4 py-3">{category.description || "—"}</td>
                      <td className="px-4 py-3">{category.active ? "Active" : "Inactive"}</td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => toggleActive(category.id, category.active)} className="text-xs text-[#c8102e]">
                          {category.active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
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
