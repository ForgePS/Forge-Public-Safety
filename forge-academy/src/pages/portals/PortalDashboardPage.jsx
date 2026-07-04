import { useParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { usePortalDefinitionsOptional } from "../../context/PortalDefinitionsContext.jsx";

export default function PortalDashboardPage() {
  const { portalSlug } = useParams();
  const portalDefs = usePortalDefinitionsOptional();
  const portal = portalSlug ? portalDefs?.bySlug[portalSlug] : null;

  return (
    <>
      <PageHeader
        title={portal?.label ?? "Portal"}
        subtitle={portal?.description || "Welcome to your portal"}
      />
      <div className="p-7">
        <p className="text-sm text-[var(--color-afta-subtle)]">
          This portal is ready for modules and pages. Assign user roles with portal access to{" "}
          <code>/{portalSlug}</code> under User Roles.
        </p>
      </div>
    </>
  );
}
