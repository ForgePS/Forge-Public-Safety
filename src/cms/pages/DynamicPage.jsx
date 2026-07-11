import { useParams, Navigate } from "react-router-dom";
import { useCms, useBrandingStyles } from "../context/CmsContext.jsx";
import { PageRenderer } from "../renderer/BlockRenderer.jsx";
import SeoHead from "../components/SeoHead.jsx";
import DynamicHeader from "../components/DynamicHeader.jsx";
import DynamicFooter from "../components/DynamicFooter.jsx";
import PopupsManager from "../components/PopupsManager.jsx";

export default function DynamicPage({ slug: propSlug }) {
  const params = useParams();
  const { getPublishedPage, branding, forms, collections, loading, redirects, settings } = useCms();
  const brandingStyles = useBrandingStyles();

  const slug = propSlug || params.slug || "home";
  const page = getPublishedPage(slug);

  const redirect = redirects?.find((r) => r.enabled && r.from === `/${slug}`);
  if (redirect) return <Navigate to={redirect.to} replace />;

  if (settings?.maintenance?.enabled && !window.location.pathname.startsWith("/admin")) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-8" style={brandingStyles}>
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-black text-white mb-4">Maintenance Mode</h1>
          <p className="text-[#94A3B8]">{settings.maintenance.message}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-[#64748B]">Loading...</div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-black" style={brandingStyles}>
        <DynamicHeader />
        <main className="py-32 text-center">
          <h1 className="text-6xl font-black text-white mb-4">404</h1>
          <p className="text-[#94A3B8]">Page not found.</p>
        </main>
        <DynamicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white" style={brandingStyles}>
      <SeoHead page={page} />
      <DynamicHeader />
      <main>
        <PageRenderer page={page} branding={branding} forms={forms} collections={collections} />
      </main>
      <DynamicFooter footerId={page.footerId} />
      <PopupsManager />
      {branding?.customCss && <style>{branding.customCss}</style>}
      {page.customCss && <style>{page.customCss}</style>}
    </div>
  );
}

export function CmsLayout({ children }) {
  const brandingStyles = useBrandingStyles();
  const { branding } = useCms();

  return (
    <div className="min-h-screen bg-black text-white" style={brandingStyles}>
      <DynamicHeader />
      <main>{children}</main>
      <DynamicFooter />
      <PopupsManager />
      {branding?.customCss && <style>{branding.customCss}</style>}
    </div>
  );
}
