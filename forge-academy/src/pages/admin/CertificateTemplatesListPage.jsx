import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import PageHeader from "../../components/PageHeader.jsx";
import { ensureDefaultCertificateTemplate, deleteCertificateTemplate, listCertificateTemplates } from "../../lib/certificateTemplates.js";

export default function CertificateTemplatesListPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState(null);

  async function loadTemplates() {
    setLoading(true);
    try {
      await ensureDefaultCertificateTemplate();
      const rows = await listCertificateTemplates();
      setTemplates(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load certificate templates.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function load() {
      setError(null);
      try {
        await ensureDefaultCertificateTemplate();
        const rows = await listCertificateTemplates();
        if (active) setTemplates(rows);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load certificate templates.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  async function handleDelete(template) {
    const message = template.isDefault
      ? `Delete "${template.name}"? It is the default template — another template will become the default.`
      : `Delete "${template.name}"? Courses using this template will fall back to the default.`;
    if (!window.confirm(message)) return;

    setDeletingId(template.id);
    setError(null);
    try {
      await deleteCertificateTemplate(template.id);
      await loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete certificate template.");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <>
      <PageHeader
        title="Certificate Templates"
        subtitle="Design and manage editable certificate layouts"
        backTo="/admin/certificates"
        backLabel="Back to certificates"
        actions={
          <Link
            to="/admin/certificates/templates/new"
            className="inline-flex items-center gap-2 rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            New template
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]">
                  <th className="px-4 py-3">Template</th>
                  <th className="px-4 py-3">Layout</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      Loading…
                    </td>
                  </tr>
                ) : templates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      No certificate templates yet.
                    </td>
                  </tr>
                ) : (
                  templates.map((template) => (
                    <tr
                      key={template.id}
                      className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]"
                    >
                      <td className="px-4 py-3 font-medium">
                        {template.name}
                        {template.isDefault ? (
                          <span className="ml-2 rounded bg-[#c8102e]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#c8102e]">
                            Default
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 capitalize">
                        {template.layoutType === "custom-image" ? "Uploaded image" : template.builtInKey}
                      </td>
                      <td className="px-4 py-3">
                        {template.courseId ? `${template.courseNumber} · ${template.courseName}` : "All courses"}
                      </td>
                      <td className="px-4 py-3">{template.status}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <Link
                            to={`/admin/certificates/templates/${template.id}`}
                            className="text-xs text-[#c8102e]"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            disabled={deletingId === template.id}
                            onClick={() => handleDelete(template)}
                            className="text-xs text-[#c8102e] disabled:opacity-60"
                          >
                            {deletingId === template.id ? "Deleting…" : "Delete"}
                          </button>
                        </div>
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
