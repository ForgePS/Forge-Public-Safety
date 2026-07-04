import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { PortalRolesProvider } from "./context/PortalRolesContext.jsx";
import { PortalDefinitionsProvider } from "./context/PortalDefinitionsContext.jsx";
import { MessagingProvider } from "./context/MessagingContext.jsx";
import { PortalThemeProvider } from "./context/PortalThemeContext.jsx";
import { SystemSettingsProvider } from "./context/SystemSettingsContext.jsx";
import MaintenanceGate from "./components/SystemSettingsRoute.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <PortalThemeProvider>
        <AuthProvider>
          <PortalRolesProvider>
            <PortalDefinitionsProvider>
              <SystemSettingsProvider>
                <MessagingProvider>
                  <MaintenanceGate>
                    <App />
                  </MaintenanceGate>
                </MessagingProvider>
              </SystemSettingsProvider>
            </PortalDefinitionsProvider>
          </PortalRolesProvider>
        </AuthProvider>
      </PortalThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
