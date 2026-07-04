import { LayoutDashboard } from "lucide-react";
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "./DashboardLayout.jsx";
import { usePortalDefinitionsOptional } from "../context/PortalDefinitionsContext.jsx";
import { customPortalPath } from "../lib/portalDefinitions.js";

export default function CustomPortalShell() {
  const { portalSlug } = useParams();
  const portalDefs = usePortalDefinitionsOptional();
  const portal = portalSlug ? portalDefs?.bySlug[portalSlug] : null;
  const basePath = portalSlug ? customPortalPath(portalSlug) : "/";

  const navItems = useMemo(
    () => [
      {
        group: "Home",
        label: "Dashboard",
        to: basePath,
        end: true,
        icon: LayoutDashboard,
      },
    ],
    [basePath],
  );

  return (
    <DashboardLayout
      portalLabel={portal?.label ?? "Custom Portal"}
      portalTitle={portal?.label ?? "Custom Portal"}
      navItems={navItems}
    />
  );
}
