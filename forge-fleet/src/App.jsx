import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import FleetPortalShell from "./components/FleetPortalShell.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ApparatusListPage from "./pages/ApparatusListPage.jsx";
import ApparatusFormPage from "./pages/ApparatusFormPage.jsx";
import EquipmentListPage from "./pages/EquipmentListPage.jsx";
import EquipmentFormPage from "./pages/EquipmentFormPage.jsx";
import DepartmentsListPage from "./pages/DepartmentsListPage.jsx";
import DepartmentFormPage from "./pages/DepartmentFormPage.jsx";
import StationsListPage from "./pages/StationsListPage.jsx";
import StationFormPage from "./pages/StationFormPage.jsx";
import TemplatesListPage from "./pages/TemplatesListPage.jsx";
import TemplateFormPage from "./pages/TemplateFormPage.jsx";
import PerformTemplatePage from "./pages/PerformTemplatePage.jsx";
import SchedulesListPage from "./pages/SchedulesListPage.jsx";
import ScheduleFormPage from "./pages/ScheduleFormPage.jsx";
import WorkOrdersListPage from "./pages/WorkOrdersListPage.jsx";
import WorkOrderFormPage from "./pages/WorkOrderFormPage.jsx";
import RecordsListPage from "./pages/RecordsListPage.jsx";
import RecordDetailPage from "./pages/RecordDetailPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<FleetPortalShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="apparatus" element={<ApparatusListPage />} />
              <Route path="apparatus/new" element={<ApparatusFormPage />} />
              <Route path="apparatus/:apparatusId" element={<ApparatusFormPage />} />
              <Route path="equipment" element={<EquipmentListPage />} />
              <Route path="equipment/new" element={<EquipmentFormPage />} />
              <Route path="equipment/:equipmentId" element={<EquipmentFormPage />} />
              <Route path="departments" element={<DepartmentsListPage />} />
              <Route path="departments/new" element={<DepartmentFormPage />} />
              <Route path="departments/:departmentId" element={<DepartmentFormPage />} />
              <Route path="stations" element={<StationsListPage />} />
              <Route path="stations/new" element={<StationFormPage />} />
              <Route path="stations/:stationId" element={<StationFormPage />} />
              <Route path="templates" element={<TemplatesListPage />} />
              <Route path="templates/new" element={<TemplateFormPage />} />
              <Route path="templates/:templateId" element={<TemplateFormPage />} />
              <Route path="templates/:templateId/perform" element={<PerformTemplatePage />} />
              <Route path="schedules" element={<SchedulesListPage />} />
              <Route path="schedules/new" element={<ScheduleFormPage />} />
              <Route path="schedules/:scheduleId" element={<ScheduleFormPage />} />
              <Route path="work-orders" element={<WorkOrdersListPage />} />
              <Route path="work-orders/new" element={<WorkOrderFormPage />} />
              <Route path="work-orders/:workOrderId" element={<WorkOrderFormPage />} />
              <Route path="records" element={<RecordsListPage />} />
              <Route path="records/:recordId" element={<RecordDetailPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
