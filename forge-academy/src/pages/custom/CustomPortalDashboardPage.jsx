import { useParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";

export default function CustomPortalDashboardPage() {
  const { portalSlug } = useParams();
  const portalDefs = usePortalDefinitionsOptional();
  const portal = portalSlug ? portalDefs?.bySlug[portalSlug] : null;

  return (
    <>
      <PageHeader
        title={portal?.label ?? "Custom Portal"}
        subtitle={portal?.description || "Welcome to your custom portal"}
      />
      <div className="p-7">
        <p className="text-sm text-[var(--color-afta-subtle)]">
          This portal is ready for modules and pages. Use User Roles to assign portal users access to{" "}
          <code>/p/{portalSlug}</code>.
        </p>
      </div>
    </>
  );
}
