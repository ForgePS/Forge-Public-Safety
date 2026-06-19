import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import HomePage from "./pages/HomePage.jsx";
import ProductsPage from "./pages/ProductsPage.jsx";
import SolutionsPage from "./pages/SolutionsPage.jsx";
import ContactPage from "./pages/ContactPage.jsx";
import CompanyPage from "./pages/CompanyPage.jsx";
import ResourcesPage from "./pages/ResourcesPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import { PrivacyPage, SecurityPage, TermsPage } from "./pages/LegalPages.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="solutions" element={<SolutionsPage />} />
        <Route path="resources" element={<ResourcesPage />} />
        <Route path="company" element={<CompanyPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="security" element={<SecurityPage />} />
        <Route path="pricing" element={<Navigate to="/contact" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
