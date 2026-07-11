import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "../cms/context/AuthContext.jsx";
import AdminLayout from "./layout/AdminLayout.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import PagesListPage from "./pages/PagesListPage.jsx";
import PageBuilderPage from "./pages/PageBuilderPage.jsx";
import BrandingPage from "./pages/BrandingPage.jsx";
import NavigationPage from "./pages/NavigationPage.jsx";
import FooterPage from "./pages/FooterPage.jsx";
import MediaPage from "./pages/MediaPage.jsx";
import FormsPage from "./pages/FormsPage.jsx";
import FormSubmissionsPage from "./pages/FormSubmissionsPage.jsx";
import CollectionsPage from "./pages/CollectionsPage.jsx";
import SeoPage from "./pages/SeoPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import RolesPage from "./pages/RolesPage.jsx";
import EmailTemplatesPage from "./pages/EmailTemplatesPage.jsx";
import PopupsPage from "./pages/PopupsPage.jsx";
import IntegrationsPage from "./pages/IntegrationsPage.jsx";
import CustomCodePage from "./pages/CustomCodePage.jsx";
import VersionsPage from "./pages/VersionsPage.jsx";
import SearchPage from "./pages/SearchPage.jsx";

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#0B1220] flex items-center justify-center text-[#64748B]">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  return children;
}

export default function AdminApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="pages" element={<PagesListPage />} />
          <Route path="pages/:pageId" element={<PageBuilderPage />} />
          <Route path="branding" element={<BrandingPage />} />
          <Route path="navigation" element={<NavigationPage />} />
          <Route path="footer" element={<FooterPage />} />
          <Route path="media" element={<MediaPage />} />
          <Route path="forms" element={<FormsPage />} />
          <Route path="forms/:formId/submissions" element={<FormSubmissionsPage />} />
          <Route path="collections" element={<CollectionsPage />} />
          <Route path="seo" element={<SeoPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="email-templates" element={<EmailTemplatesPage />} />
          <Route path="popups" element={<PopupsPage />} />
          <Route path="integrations" element={<IntegrationsPage />} />
          <Route path="custom-code" element={<CustomCodePage />} />
          <Route path="versions" element={<VersionsPage />} />
          <Route path="search" element={<SearchPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
