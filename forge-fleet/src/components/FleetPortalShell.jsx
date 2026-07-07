import { NavLink, Outlet } from "react-router-dom";
import {
  Building2,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  Package,
  Settings,
  Truck,
  Wrench,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { getStorageMode } from "../lib/dataStore.js";

const navItems = [
  { label: "Dashboard", to: "/", end: true, icon: LayoutDashboard },
  { label: "Apparatus", to: "/apparatus", icon: Truck },
  { label: "Equipment", to: "/equipment", icon: Package },
  { label: "Departments", to: "/departments", icon: Building2 },
  { label: "Stations", to: "/stations", icon: Building2 },
  { label: "Templates", to: "/templates", icon: ClipboardList },
  { label: "Schedules", to: "/schedules", icon: Calendar },
  { label: "Work Orders", to: "/work-orders", icon: Wrench },
  { label: "Records", to: "/records", icon: ClipboardCheck },
  { label: "Settings", to: "/settings", icon: Settings },
];

export default function FleetPortalShell() {
  const { user, logOut } = useAuth();
  const storageMode = getStorageMode();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col bg-[var(--color-fleet-sidebar)] text-white">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/50">Forge Fleet</p>
          <h1 className="mt-1 text-sm font-semibold">Maintenance Module</h1>
          <p className="mt-1 text-[10px] text-white/40">{storageMode === "firebase" ? "Firebase" : "Local Demo"}</p>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                      isActive ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/8 hover:text-white"
                    }`
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-xs font-semibold text-white/80">{user?.displayName ?? "User"}</p>
          <p className="text-[10px] text-white/40">{user?.role ?? "admin"}</p>
          <button type="button" onClick={() => logOut()} className="mt-2 text-[10px] font-semibold text-white/50 hover:text-white">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
