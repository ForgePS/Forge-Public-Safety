import { useEffect } from "react";
import { NavLink, Outlet, useNavigate, useParams, useSearchParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { SYSTEM_SETTINGS_SECTIONS } from "../../lib/systemSettings.js";
import { ROLE_LABELS, ROLES, isFullAdmin, isSystemSettingsAdmin } from "../../lib/roles.js";

export const PORTAL_ACCESS_SETTINGS_PATH = "portal-access";
export const USER_ROLES_SETTINGS_PATH = "user-roles";
const DEFAULT_SECTION_ID = SYSTEM_SETTINGS_SECTIONS[0].id;

const SECTION_ALIASES = {
  certificate: "certificates",
  certificateTemplate: "certificates",
  certificateTemplates: "certificates",
};

function resolveSectionId(sectionParam) {
  const normalizedSection = SECTION_ALIASES[sectionParam ?? ""] ?? sectionParam;
  if (
    normalizedSection &&
    (normalizedSection === PORTAL_ACCESS_SETTINGS_PATH ||
      normalizedSection === USER_ROLES_SETTINGS_PATH ||
      SYSTEM_SETTINGS_SECTIONS.some((section) => section.id === normalizedSection))
  ) {
    return normalizedSection;
  }
  return DEFAULT_SECTION_ID;
}

function sidebarLinkClass(isActive) {
  return `rounded-[10px] px-3 py-2 text-left text-sm transition ${
    isActive
      ? "bg-[#c8102e]/10 font-semibold text-[#c8102e]"
      : "text-[var(--color-afta-text)] hover:bg-[var(--color-afta-bg)]"
  }`;
}

export default function AdminSystemSettingsLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { sectionId: sectionParam } = useParams();
  const [searchParams] = useSearchParams();
  const legacySection = searchParams.get("section");
  const activeSectionId = resolveSectionId(sectionParam ?? legacySection);

  useEffect(() => {
    if (legacySection && !sectionParam) {
      navigate(`/admin/settings/${resolveSectionId(legacySection)}`, { replace: true });
    }
  }, [legacySection, navigate, sectionParam]);

  const canManagePortalAccess = isSystemSettingsAdmin(user?.role);
  const canManageUserRoles = isFullAdmin(user?.role);

  return (
    <>
      <PageHeader
        title="System Settings"
        subtitle="Global configuration, portal access, and user roles"
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:flex-row lg:p-7">
        <aside className="app-panel w-full shrink-0 p-3 lg:w-72">
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">
            Configuration
          </p>
          <nav className="flex max-h-[50vh] flex-col gap-0.5 overflow-y-auto">
            {SYSTEM_SETTINGS_SECTIONS.map((section) => (
              <NavLink
                key={section.id}
                to={`/admin/settings/${section.id}`}
                className={({ isActive }) => sidebarLinkClass(isActive || activeSectionId === section.id)}
              >
                {section.title}
              </NavLink>
            ))}
          </nav>

          {canManagePortalAccess || canManageUserRoles ? (
            <>
              <p className="mt-4 px-2 pb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">
                Access control
              </p>
              <nav className="flex flex-col gap-0.5">
                {canManagePortalAccess ? (
                  <NavLink
                    to={`/admin/settings/${PORTAL_ACCESS_SETTINGS_PATH}`}
                    className={({ isActive }) => sidebarLinkClass(isActive)}
                  >
                    Portal Access
                  </NavLink>
                ) : null}
                {canManageUserRoles ? (
                  <NavLink
                    to={`/admin/settings/${USER_ROLES_SETTINGS_PATH}`}
                    className={({ isActive }) => sidebarLinkClass(isActive)}
                  >
                    User Roles
                  </NavLink>
                ) : null}
              </nav>
            </>
          ) : null}

          <div className="mt-4 border-t border-[var(--color-afta-border)] px-2 pt-4 text-xs text-[var(--color-afta-subtle)]">
            <p>
              Signed in as{" "}
              <span className="font-medium text-[var(--color-afta-text)]">
                {ROLE_LABELS[user?.role ?? ROLES.ACADEMY_ADMIN]}
              </span>
            </p>
            <p className="mt-2">Changes apply academy-wide and are audit logged.</p>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <Outlet />
        </section>
      </div>
    </>
  );
}
