import { lazy, Suspense, useMemo } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { CmsProvider } from "./cms/context/CmsContext.jsx";
import DynamicPage from "./cms/pages/DynamicPage.jsx";
import MarketingSite from "./marketing/MarketingSite.jsx";
import { DEFAULT_PROGRAM_ID, resolveProgramFromHost } from "./cms/core/programs.js";

const AdminApp = lazy(() => import("./admin/AdminApp.jsx"));

function AdminLoader() {
  return (
    <div className="min-h-screen bg-[#0B1220] flex items-center justify-center text-[#64748B]">
      Loading admin...
    </div>
  );
}

function PublicSite() {
  const location = useLocation();
  const program = useMemo(
    () => resolveProgramFromHost(typeof window !== "undefined" ? window.location.hostname : "localhost"),
    [location.pathname]
  );

  // Main marketing host: restored “Website style update” rugged site.
  // Other programs stay on the CMS DynamicPage renderer.
  if (program.id === DEFAULT_PROGRAM_ID) {
    return <MarketingSite />;
  }

  return (
    <Routes>
      <Route path="/" element={<DynamicPage slug="home" />} />
      <Route path="/:slug" element={<DynamicPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <CmsProvider>
        <Routes>
          <Route path="/admin/*" element={<Suspense fallback={<AdminLoader />}><AdminApp /></Suspense>} />
          <Route path="/*" element={<PublicSite />} />
        </Routes>
      </CmsProvider>
    </BrowserRouter>
  );
}
