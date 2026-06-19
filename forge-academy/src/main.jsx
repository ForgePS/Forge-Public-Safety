import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { PortalThemeProvider } from "./context/PortalThemeContext.jsx";
import { SystemSettingsProvider } from "./context/SystemSettingsContext.jsx";
import MaintenanceGate from "./components/SystemSettingsRoute.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <PortalThemeProvider>
        <AuthProvider>
          <SystemSettingsProvider>
            <MaintenanceGate>
              <App />
            </MaintenanceGate>
          </SystemSettingsProvider>
        </AuthProvider>
      </PortalThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
