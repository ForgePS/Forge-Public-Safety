import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileText, Palette, Menu, PanelBottom, Image, FormInput,
  Database, Search, Settings, Shield, Mail, Bell, Plug, Code, History, LogOut, ExternalLink, Layers,
} from "lucide-react";
import { useAuth } from "../../cms/context/AuthContext.jsx";
import { useCms } from "../../cms/context/CmsContext.jsx";
import ProgramSwitcher from "../components/ProgramSwitcher.jsx";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/programs", label: "Programs", icon: Layers },
  { to: "/admin/pages", label: "Pages", icon: FileText },
  { to: "/admin/branding", label: "Branding", icon: Palette },
  { to: "/admin/navigation", label: "Navigation", icon: Menu },
  { to: "/admin/footer", label: "Footer", icon: PanelBottom },
  { to: "/admin/media", label: "Media Library", icon: Image },
  { to: "/admin/forms", label: "Forms", icon: FormInput },
  { to: "/admin/collections", label: "Collections", icon: Database },
  { to: "/admin/seo", label: "SEO", icon: Search },
  { to: "/admin/popups", label: "Popups & Banners", icon: Bell },
  { to: "/admin/email-templates", label: "Email Templates", icon: Mail },
  { to: "/admin/search", label: "Search", icon: Search },
  { to: "/admin/integrations", label: "Integrations", icon: Plug },
  { to: "/admin/custom-code", label: "Custom Code", icon: Code },
  { to: "/admin/versions", label: "Version History", icon: History },
  { to: "/admin/roles", label: "Roles & Users", icon: Shield },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { program } = useCms();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  const previewUrl = program?.liveUrl || "/";

  return (
    <div className="min-h-screen bg-[#0B1220] text-white flex">
      <aside className="w-64 shrink-0 border-r border-[#1E293B] flex flex-col">
        <div className="p-4 border-b border-[#1E293B]">
          <h1 className="text-lg font-black tracking-tight">Forge CMS</h1>
          <p className="text-xs text-[#64748B] mt-1">Unified Control Center</p>
          <div className="mt-3">
            <ProgramSwitcher />
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-[#F97316]/15 text-[#F97316]" : "text-[#94A3B8] hover:text-white hover:bg-white/5"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-[#1E293B] space-y-2">
          <a href={previewUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 text-sm text-[#94A3B8] hover:text-white rounded-lg hover:bg-white/5">
            <ExternalLink size={16} /> View {program?.shortName || "Site"}
          </a>
          <div className="px-3 py-2 text-xs text-[#64748B]">{user?.name || user?.email}</div>
          <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#94A3B8] hover:text-white rounded-lg hover:bg-white/5">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
