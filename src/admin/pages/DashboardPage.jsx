import { Link } from "react-router-dom";
import { FileText, Clock, Plus } from "lucide-react";
import { useCms } from "../../cms/context/CmsContext.jsx";
import AdminPageHeader from "../components/AdminPageHeader.jsx";

export default function DashboardPage() {
  const { pages, forms, settings, loading } = useCms();

  if (loading) return <div className="p-8 text-[#64748B]">Loading dashboard...</div>;

  const published = pages.filter((p) => p.status === "published").length;
  const drafts = pages.filter((p) => p.status === "draft").length;
  const recent = [...pages].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)).slice(0, 5);

  return (
    <div className="p-8">
      <AdminPageHeader title="Dashboard" description="Manage your entire website from one place." />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-8">
        <StatCard label="Total Pages" value={pages.length} />
        <StatCard label="Published" value={published} />
        <StatCard label="Drafts" value={drafts} />
        <StatCard label="Forms" value={forms.length} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#1E293B] bg-[#111827] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Recent Pages</h2>
            <Link to="/admin/pages" className="text-sm text-[#F97316] hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {recent.map((page) => (
              <Link key={page.id} to={`/admin/pages/${page.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-[#64748B]" />
                  <div>
                    <p className="text-sm font-medium text-white">{page.title}</p>
                    <p className="text-xs text-[#64748B]">/{page.slug}</p>
                  </div>
                </div>
                <StatusBadge status={page.status} />
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#1E293B] bg-[#111827] p-6">
          <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid gap-3">
            <Link to="/admin/pages" className="flex items-center gap-3 p-4 rounded-xl border border-[#1E293B] hover:border-[#F97316]/50 transition-colors">
              <Plus size={20} className="text-[#F97316]" />
              <div>
                <p className="text-sm font-bold text-white">Create New Page</p>
                <p className="text-xs text-[#64748B]">Build a page from scratch with the visual editor</p>
              </div>
            </Link>
            <Link to="/admin/branding" className="flex items-center gap-3 p-4 rounded-xl border border-[#1E293B] hover:border-[#F97316]/50 transition-colors">
              <Clock size={20} className="text-[#F97316]" />
              <div>
                <p className="text-sm font-bold text-white">Update Branding</p>
                <p className="text-xs text-[#64748B]">Colors, fonts, logos, and global styles</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {settings?.maintenance?.enabled && (
        <div className="mt-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-200 text-sm">
          Maintenance mode is currently enabled. Public visitors see the maintenance page.
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#1E293B] bg-[#111827] p-6">
      <p className="text-sm text-[#64748B]">{label}</p>
      <p className="text-3xl font-black text-white mt-1">{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = { published: "bg-green-500/15 text-green-400", draft: "bg-yellow-500/15 text-yellow-400", scheduled: "bg-blue-500/15 text-blue-400", archived: "bg-gray-500/15 text-gray-400" };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] || colors.draft}`}>{status}</span>;
}
