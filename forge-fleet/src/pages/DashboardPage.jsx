import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Calendar, ClipboardCheck, Truck, Wrench } from "lucide-react";
import PageHeader, { StatCard } from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { listApparatus, APPARATUS_STATUS_LABELS } from "../lib/apparatus.js";
import { listWorkOrders, WORK_ORDER_STATUS_LABELS } from "../lib/workOrders.js";
import { listMaintenanceSchedules, getScheduleDueStatus } from "../lib/maintenanceSchedules.js";
import { listMaintenanceRecords } from "../lib/maintenanceRecords.js";
import { listRecentAuditEntries } from "../lib/maintenanceAuditLog.js";
import { listEquipment } from "../lib/equipment.js";

export default function DashboardPage() {
  const [stats, setStats] = useState({ apparatus: 0, inService: 0, outOfService: 0, maintenance: 0, openWorkOrders: 0, overdueSchedules: 0, equipment: 0, records: 0 });
  const [overdueSchedules, setOverdueSchedules] = useState([]);
  const [openWorkOrders, setOpenWorkOrders] = useState([]);
  const [recentAudit, setRecentAudit] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [apparatus, workOrders, schedules, records, equipment, audit] = await Promise.all([
        listApparatus(),
        listWorkOrders(),
        listMaintenanceSchedules(),
        listMaintenanceRecords(),
        listEquipment(),
        listRecentAuditEntries(10),
      ]);

      const overdue = schedules.filter((s) => getScheduleDueStatus(s) === "overdue");
      const open = workOrders.filter((w) => w.status === "open" || w.status === "in_progress");

      setStats({
        apparatus: apparatus.length,
        inService: apparatus.filter((a) => a.status === "in_service").length,
        outOfService: apparatus.filter((a) => a.status === "out_of_service").length,
        maintenance: apparatus.filter((a) => a.status === "maintenance").length,
        openWorkOrders: open.length,
        overdueSchedules: overdue.length,
        equipment: equipment.length,
        records: records.length,
      });
      setOverdueSchedules(overdue.slice(0, 5));
      setOpenWorkOrders(open.slice(0, 5));
      setRecentAudit(audit);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="p-6 text-sm text-[var(--color-fleet-muted)]">Loading dashboard…</div>;
  }

  return (
    <>
      <PageHeader title="Fleet Dashboard" subtitle="Equipment & apparatus maintenance overview" />
      <div className="flex-1 overflow-y-auto p-6 lg:p-7">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Apparatus" value={stats.apparatus} sub={`${stats.inService} in service`} icon={Truck} linkTo="/apparatus" linkLabel="View all" />
          <StatCard label="Open Work Orders" value={stats.openWorkOrders} warn={stats.openWorkOrders > 0} icon={Wrench} linkTo="/work-orders" linkLabel="Manage" />
          <StatCard label="Overdue Schedules" value={stats.overdueSchedules} warn={stats.overdueSchedules > 0} icon={Calendar} linkTo="/schedules" linkLabel="View schedules" />
          <StatCard label="Maintenance Records" value={stats.records} sub={`${stats.equipment} equipment items`} icon={ClipboardCheck} linkTo="/records" linkLabel="View records" />
        </div>

        {(stats.outOfService > 0 || stats.maintenance > 0) ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              {stats.outOfService > 0 ? `${stats.outOfService} apparatus out of service` : ""}
              {stats.outOfService > 0 && stats.maintenance > 0 ? " · " : ""}
              {stats.maintenance > 0 ? `${stats.maintenance} in maintenance` : ""}
            </span>
            <Link to="/apparatus" className="ml-auto text-xs font-semibold text-amber-900 hover:underline">View apparatus</Link>
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="app-panel p-5">
            <h2 className="text-sm font-semibold">Overdue Maintenance</h2>
            {overdueSchedules.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--color-fleet-muted)]">No overdue schedules.</p>
            ) : (
              <table className="app-table mt-3">
                <thead><tr><th>Schedule</th><th>Apparatus</th><th>Due</th></tr></thead>
                <tbody>
                  {overdueSchedules.map((s) => (
                    <tr key={s.id}>
                      <td><Link to={`/schedules/${s.id}`} className="font-semibold text-[var(--color-fleet-red)] hover:underline">{s.name}</Link></td>
                      <td>{s.apparatusName}</td>
                      <td><StatusBadge status="overdue" label={s.nextDueDate} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="app-panel p-5">
            <h2 className="text-sm font-semibold">Open Work Orders</h2>
            {openWorkOrders.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--color-fleet-muted)]">No open work orders.</p>
            ) : (
              <table className="app-table mt-3">
                <thead><tr><th>WO #</th><th>Title</th><th>Status</th></tr></thead>
                <tbody>
                  {openWorkOrders.map((w) => (
                    <tr key={w.id}>
                      <td><Link to={`/work-orders/${w.id}`} className="font-semibold text-[var(--color-fleet-red)] hover:underline">{w.workOrderNumber}</Link></td>
                      <td>{w.title}</td>
                      <td><StatusBadge status={w.status} label={WORK_ORDER_STATUS_LABELS[w.status]} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <section className="app-panel mt-6 p-5">
          <h2 className="text-sm font-semibold">Recent Activity</h2>
          {recentAudit.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--color-fleet-muted)]">No recent activity.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {recentAudit.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 text-sm">
                  <span className="text-[11px] text-[var(--color-fleet-subtle)]">{entry.timestamp?.slice(0, 10)}</span>
                  <span className="font-semibold">{entry.actorName}</span>
                  <span className="text-[var(--color-fleet-muted)]">{entry.action}</span>
                  <span>{entry.entityLabel}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
