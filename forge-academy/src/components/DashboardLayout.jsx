import { NavLink, Outlet } from "react-router-dom";
import { Megaphone } from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_LABELS } from "../lib/roles.js";
import { manageAnnouncementsPathForRole } from "../lib/portalAnnouncements.js";
import DashboardTopBar from "./DashboardTopBar.jsx";

/**
 * @param {{ label: string, to: string, end?: boolean, group?: string, icon?: import('react').ComponentType<{ className?: string }> }[]} navItems
 * @param {import('../lib/roles.js').Role | null | undefined} role
 */
function withAnnouncementsNavItem(navItems, role) {
  const managePath = manageAnnouncementsPathForRole(role);
  if (!managePath || navItems.some((item) => item.to === managePath)) {
    return navItems;
  }

  const dashboardIndex = navItems.findIndex((item) => item.end);
  const insertAt = dashboardIndex >= 0 ? dashboardIndex + 1 : 0;
  const group = navItems[dashboardIndex]?.group ?? navItems[0]?.group ?? "Overview";

  const announcementItem = {
    group,
    label: "Announcements",
    to: managePath,
    icon: Megaphone,
  };

  return [...navItems.slice(0, insertAt), announcementItem, ...navItems.slice(insertAt)];
}

/**
 * @param {{
 *   portalLabel: string,
 *   portalTitle?: string,
 *   navItems: { label: string, to: string, end?: boolean, group?: string, icon?: import('react').ComponentType<{ className?: string }> }[],
 *   showTopBar?: boolean,
 *   announcement?: string,
 * }} props
 */
export default function DashboardLayout({
  portalLabel,
  portalTitle,
  navItems,
  showTopBar = true,
  announcement = "",
}) {
  const { user } = useAuth();
  const mergedNavItems = useMemo(
    () => withAnnouncementsNavItem(navItems, user?.role),
    [navItems, user?.role],
  );

  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "??";

  return (
    <div className="grid min-h-screen lg:grid-cols-[248px_1fr] bg-[var(--color-afta-bg)]">
      <aside className="no-print flex flex-col border-b border-[#1e3a5f] bg-[var(--color-afta-sidebar)] p-5 lg:border-b-0 lg:border-r lg:border-[#1e3a5f]">
        <div className="flex items-center gap-3 border-b border-[#1e3a5f] pb-5">
          <img
            src="/afta-logo.png"
            alt="Arkansas Fire Training Academy"
            className="h-12 w-12 object-contain"
          />
          <div>
            <p className="text-sm font-semibold text-white">AFTA Portal</p>
            <p className="text-[10px] leading-snug text-[#94a3b8]">{portalLabel}</p>
          </div>
        </div>

        <nav className="mt-5 flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {mergedNavItems.map((item, index) => {
            const Icon = item.icon;
            const showGroup =
              item.group && (index === 0 || mergedNavItems[index - 1]?.group !== item.group);
            return (
              <div key={`${item.to}-${item.label}`}>
                {showGroup ? (
                  <p className="mb-1 mt-3 px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748b] first:mt-0">
                    {item.group}
                  </p>
                ) : null}
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-[var(--color-afta-red)] text-white"
                        : "text-[#cbd5e1] hover:bg-[#1e3a5f]/60 hover:text-white",
                    ].join(" ")
                  }
                >
                  {Icon ? <Icon className="h-4 w-4 shrink-0 opacity-90" /> : null}
                  {item.label}
                </NavLink>
              </div>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-[#1e3a5f] pt-4">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#1e3a5f] text-[11px] font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{user?.displayName || user?.email}</p>
              <p className="truncate text-[10px] text-[#94a3b8]">
                {user ? ROLE_LABELS[user.role] : ""}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        {showTopBar ? <DashboardTopBar portalTitle={portalTitle ?? portalLabel} /> : null}
        {announcement ? (
          <div className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-sm text-amber-900 lg:px-7">
            {announcement}
          </div>
        ) : null}
        <Outlet />
      </div>
    </div>
  );
}
