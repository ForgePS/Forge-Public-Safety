import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import PageHeader from "../components/PageHeader.jsx";
import { getStorageMode } from "../lib/dataStore.js";
import { resetDemoData, seedDemoData } from "../lib/seedData.js";
import { listDepartments } from "../lib/departments.js";
import { listStations } from "../lib/stations.js";
import { listApparatus } from "../lib/apparatus.js";
import { listEquipment } from "../lib/equipment.js";
import { listMaintenanceSchedules } from "../lib/maintenanceSchedules.js";
import { listWorkOrders } from "../lib/workOrders.js";
import { listMaintenanceRecords } from "../lib/maintenanceRecords.js";
import { downloadFleetSyncExport } from "../lib/rmsIntegration.js";

export default function SettingsPage() {
  const storageMode = getStorageMode();
  const [counts, setCounts] = useState({});

  useEffect(() => {
    Promise.all([
      listDepartments(), listStations(), listApparatus(), listEquipment(),
      listMaintenanceSchedules(), listWorkOrders(), listMaintenanceRecords(),
    ]).then(([d, s, a, e, sch, w, r]) => {
      setCounts({ departments: d.length, stations: s.length, apparatus: a.length, equipment: e.length, schedules: sch.length, workOrders: w.length, records: r.length });
    });
  }, []);

  async function handleResetDemo() {
    if (!window.confirm("Reset all demo data? This cannot be undone.")) return;
    resetDemoData();
    await seedDemoData();
    window.location.reload();
  }

  async function handleExport() {
    const [departments, stations, apparatus, equipment, schedules, workOrders, records] = await Promise.all([
      listDepartments(), listStations(), listApparatus(), listEquipment(),
      listMaintenanceSchedules(), listWorkOrders(), listMaintenanceRecords(),
    ]);
    downloadFleetSyncExport({ departments, stations, apparatus, equipment, schedules, workOrders, records });
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Storage, integration, and data management" />
      <div className="flex-1 overflow-y-auto p-6 lg:p-7 space-y-6">
        <section className="app-panel p-5">
          <h2 className="text-sm font-semibold">Storage Mode</h2>
          <p className="mt-2 text-sm text-[var(--color-fleet-muted)]">
            Current mode: <strong className="text-[var(--color-fleet-text)]">{storageMode}</strong>
            {storageMode === "local" ? " — data stored in browser localStorage" : " — data stored in Firebase Firestore"}
          </p>
          <p className="mt-2 text-[11px] text-[var(--color-fleet-subtle)]">
            Set <code>VITE_FLEET_STORAGE=firebase</code> and configure Firebase env vars to switch to production storage.
          </p>
        </section>

        <section className="app-panel p-5">
          <h2 className="text-sm font-semibold">Data Summary</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            {Object.entries(counts).map(([key, value]) => (
              <div key={key} className="rounded-lg border border-[var(--color-fleet-border)] p-3">
                <p className="text-[10px] font-semibold uppercase text-[var(--color-fleet-muted)]">{key}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="app-panel p-5">
          <h2 className="text-sm font-semibold">RMS Integration</h2>
          <p className="mt-2 text-sm text-[var(--color-fleet-muted)]">
            Export fleet data as JSON for RMS sync. Webhook endpoints are stubbed and ready for Forge RMS integration.
          </p>
          <div className="mt-4 flex gap-3">
            <button type="button" className="app-btn-primary inline-flex items-center gap-1.5" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" /> Export Fleet Sync JSON
            </button>
          </div>
          <p className="mt-3 text-[11px] text-[var(--color-fleet-subtle)]">
            See <code>forge-fleet/docs/RMS_INTEGRATION.md</code> for API contracts and integration steps.
          </p>
        </section>

        {storageMode === "local" ? (
          <section className="app-panel p-5">
            <h2 className="text-sm font-semibold">Demo Data</h2>
            <p className="mt-2 text-sm text-[var(--color-fleet-muted)]">Reset and reload sample Springfield FD demo data.</p>
            <button type="button" className="app-btn-secondary mt-3 inline-flex items-center gap-1.5" onClick={handleResetDemo}>
              <RefreshCw className="h-3.5 w-3.5" /> Reset Demo Data
            </button>
          </section>
        ) : null}
      </div>
    </>
  );
}
