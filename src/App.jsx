import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CmsProvider } from "./cms/context/CmsContext.jsx";
import DynamicPage from "./cms/pages/DynamicPage.jsx";

const AdminApp = lazy(() => import("./admin/AdminApp.jsx"));

function AdminLoader() {
  return (
    <div className="min-h-screen bg-[#0B1220] flex items-center justify-center text-[#64748B]">
      Loading admin...
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <CmsProvider>
        <Routes>
          <Route path="/admin/*" element={<Suspense fallback={<AdminLoader />}><AdminApp /></Suspense>} />
          <Route path="/" element={<DynamicPage slug="home" />} />
          <Route path="/:slug" element={<DynamicPage />} />
        </Routes>
      </CmsProvider>
    </BrowserRouter>
  );
}
