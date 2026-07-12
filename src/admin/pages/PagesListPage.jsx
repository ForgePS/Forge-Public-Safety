import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Copy, Trash2, Eye, EyeOff } from "lucide-react";
import { useCms } from "../../cms/context/CmsContext.jsx";
import { createPageId } from "../../cms/core/ids.js";
import { DEFAULT_PAGE } from "../../cms/blocks/registry.js";
import { sanitizeSlug } from "../../cms/core/validation.js";
import AdminPageHeader, { AdminButton } from "../components/AdminPageHeader.jsx";

export default function PagesListPage() {
  const { pages, store, refresh, programId } = useCms();
  const navigate = useNavigate();
  const [toast, setToast] = useState("");

  const createPage = async () => {
    const page = {
      id: createPageId(),
      ...DEFAULT_PAGE,
      programId,
      title: "New Page",
      slug: `new-page-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    await store.save("pages", page);
    await refresh();
    navigate(`/admin/pages/${page.id}`);
  };

  const duplicatePage = async (page) => {
    const copy = {
      ...JSON.parse(JSON.stringify(page)),
      id: createPageId(),
      title: `${page.title} (Copy)`,
      slug: `${page.slug}-copy`,
      status: "draft",
      createdAt: new Date().toISOString(),
    };
    await store.save("pages", copy);
    await refresh();
    setToast("Page duplicated");
  };

  const deletePage = async (page) => {
    if (!confirm(`Delete "${page.title}"? This cannot be undone.`)) return;
    await store.remove("pages", page.id);
    await refresh();
    setToast("Page deleted");
  };

  const togglePublish = async (page) => {
    const updated = { ...page, status: page.status === "published" ? "draft" : "published" };
    await store.save("pages", updated);
    await refresh();
  };

  return (
    <div className="p-8">
      <AdminPageHeader
        title="Pages"
        description="Create, edit, and manage all website pages."
        actions={<AdminButton onClick={createPage}><Plus size={16} /> New Page</AdminButton>}
      />

      {toast && <div className="mt-4 rounded-xl bg-green-500/15 border border-green-500/30 text-green-300 px-4 py-2 text-sm">{toast}</div>}

      <div className="mt-8 rounded-2xl border border-[#1E293B] bg-[#111827] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1E293B] text-[#64748B] text-left">
              <th className="px-6 py-3 font-medium">Title</th>
              <th className="px-6 py-3 font-medium">Slug</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Updated</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id} className="border-b border-[#1E293B]/50 hover:bg-white/[0.02]">
                <td className="px-6 py-4">
                  <Link to={`/admin/pages/${page.id}`} className="font-medium text-white hover:text-[#F97316]">{page.title}</Link>
                </td>
                <td className="px-6 py-4 text-[#94A3B8]">/{page.slug}</td>
                <td className="px-6 py-4"><StatusBadge status={page.status} /></td>
                <td className="px-6 py-4 text-[#64748B]">{page.updatedAt ? new Date(page.updatedAt).toLocaleDateString() : "—"}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <a href={page.slug === "home" ? "/" : `/${page.slug}`} target="_blank" rel="noreferrer" className="p-2 text-[#64748B] hover:text-white rounded-lg hover:bg-white/5" title="Preview"><Eye size={16} /></a>
                    <button onClick={() => togglePublish(page)} className="p-2 text-[#64748B] hover:text-white rounded-lg hover:bg-white/5" title={page.status === "published" ? "Unpublish" : "Publish"}>
                      {page.status === "published" ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button onClick={() => duplicatePage(page)} className="p-2 text-[#64748B] hover:text-white rounded-lg hover:bg-white/5" title="Duplicate"><Copy size={16} /></button>
                    <button onClick={() => deletePage(page)} className="p-2 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10" title="Delete"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pages.length === 0 && (
          <div className="p-12 text-center text-[#64748B]">
            <p>No pages yet.</p>
            <AdminButton onClick={createPage} className="mt-4"><Plus size={16} /> Create your first page</AdminButton>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = { published: "bg-green-500/15 text-green-400", draft: "bg-yellow-500/15 text-yellow-400", scheduled: "bg-blue-500/15 text-blue-400" };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] || colors.draft}`}>{status}</span>;
}
