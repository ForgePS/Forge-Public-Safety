import { Link } from "react-router-dom";
import { Settings, Shield, Tags, UserCog, Users, MonitorPlay, Sparkles } from "lucide-react";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  ALL_ROLES,
  ROLE_LABELS,
  ROLES,
  canManageAllPortalRoles,
  isCreator,
} from "../../lib/roles.js";

const QUICK_LINKS = [
  {
    title: "Portal Users",
    description: "Create logins, assign roles, upload staff photos, and manage permissions.",
    to: "/admin/users",
    icon: UserCog,
    action: "Manage users",
  },
  {
    title: "Add Portal User",
    description: "Create a new Firebase Auth account with a role profile.",
    to: "/admin/users/new",
    icon: Users,
    action: "Create user",
  },
  {
    title: "Portal Roles",
    description: "Create custom roles and choose which portal each role can access.",
    to: "/admin/roles",
    icon: Tags,
    action: "Manage roles",
  },
  {
    title: "System Settings",
    description: "Enable modules, AI Builder, Digital Dashboard, feature flags, and security.",
    to: "/admin/settings",
    icon: Settings,
    action: "Open settings",
  },
  {
    title: "Digital Dashboard",
    description: "Edit displays, playlists, dining menus, layouts, and media.",
    to: "/admin/digital-dashboard",
    icon: MonitorPlay,
    action: "Open dashboard",
  },
  {
    title: "AI Builder",
    description: "Turn on AI-assisted editors under System Settings → Feature Flags.",
    to: "/admin/settings?section=features",
    icon: Sparkles,
    action: "Feature flags",
  },
];

export default function AdminCreatorConsolePage() {
  const { user } = useAuth();
  const platformManager = canManageAllPortalRoles(user?.role);

  if (!platformManager) {
    return (
      <div className="p-7">
        <h2 className="text-lg font-semibold text-[var(--color-afta-text)]">Access denied</h2>
        <p className="mt-2 text-sm text-[var(--color-afta-subtle)]">
          The Creator Console is for Creator and Super Admin accounts only.
        </p>
        <Link to="/admin" className="app-btn-secondary mt-4 inline-block px-4 py-2 text-xs">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Creator Console"
        subtitle="Create and edit platform configuration without leaving the portal"
        actions={
          <Link to="/admin/users/new" className="app-btn-primary px-4 py-2 text-xs">
            Add portal user
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        <section className="app-panel p-5">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-[#c8102e]" />
            <div>
              <p className="text-sm font-semibold text-[var(--color-afta-text)]">
                Signed in as {ROLE_LABELS[user?.role ?? ROLES.ACADEMY_ADMIN]}
              </p>
              <p className="mt-1 text-sm text-[var(--color-afta-subtle)]">
                {user?.displayName} · {user?.email}
              </p>
              {!isCreator(user?.role) ? (
                <p className="mt-2 text-xs text-[var(--color-afta-muted)]">
                  Super Admins have full create/edit access here and can assign every portal role,
                  including Creator.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {QUICK_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.to} className="app-panel flex flex-col p-5">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[#c8102e]" />
                  <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">{item.title}</h2>
                </div>
                <p className="mt-2 flex-1 text-sm text-[var(--color-afta-subtle)]">{item.description}</p>
                <Link to={item.to} className="app-btn-secondary mt-4 inline-block w-fit px-3 py-2 text-xs">
                  {item.action}
                </Link>
              </article>
            );
          })}
        </div>

        <section className="app-panel p-5">
          <h2 className="text-sm font-semibold text-[var(--color-afta-text)]">Portal role assignment</h2>
          <p className="mt-1 text-sm text-[var(--color-afta-subtle)]">
            Creator and Super Admin accounts can assign any role when creating or editing portal users.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase tracking-wide text-[var(--color-afta-muted)]">
                  <th className="px-3 py-2 font-semibold">Role</th>
                  <th className="px-3 py-2 font-semibold">Portal</th>
                </tr>
              </thead>
              <tbody>
                {ALL_ROLES.map((role) => (
                  <tr key={role} className="border-b border-[var(--color-afta-border)]">
                    <td className="px-3 py-2 font-medium text-[var(--color-afta-text)]">
                      {ROLE_LABELS[role]}
                    </td>
                    <td className="px-3 py-2 text-[var(--color-afta-subtle)]">
                      {role === ROLES.STUDENT
                        ? "/student"
                        : role === ROLES.DEPARTMENT
                          ? "/department"
                          : role === ROLES.INSTRUCTOR
                            ? "/instructor"
                            : role === ROLES.CERTIFICATION_OFFICER
                              ? "/certification"
                              : "/admin"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
