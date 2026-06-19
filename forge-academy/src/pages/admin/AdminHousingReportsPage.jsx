import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { listHousingAuditEntries } from "../../lib/housingAuditLog.js";
import { getHousingSettings, saveHousingSettings } from "../../lib/housingSettings.js";
import {
  buildClassHousingRoster,
  downloadHousingRosterCsv,
  downloadRoomReportCsv,
} from "../../lib/housingReports.js";
import { listHousingRequiredClasses } from "../../lib/classes.js";
import { listRooms, ROOM_STATUSES } from "../../lib/rooms.js";
import { listAssignmentsByClass, ASSIGNMENT_STATUSES } from "../../lib/roomAssignments.js";

export default function AdminHousingReportsPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [settings, setSettings] = useState(null);
  const [auditCount, setAuditCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([listHousingRequiredClasses(), listRooms(), getHousingSettings(), listHousingAuditEntries()])
      .then(([classRows, roomRows, housingSettings, auditRows]) => {
        setClasses(classRows);
        setRooms(roomRows);
        setSettings(housingSettings);
        setAuditCount(auditRows.length);
        if (classRows[0]) setSelectedClassId(classRows[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load housing reports."))
      .finally(() => setLoading(false));
  }, []);

  async function exportClassRoster() {
    if (!selectedClassId) return;
    const roster = await buildClassHousingRoster(selectedClassId);
    const classSession = classes.find((item) => item.id === selectedClassId);
    downloadHousingRosterCsv(
      roster,
      `${classSession?.courseNumber || "class"}-housing-roster.csv`,
    );
  }

  async function exportCheckInReport() {
    if (!selectedClassId) return;
    const assignments = await listAssignmentsByClass(selectedClassId);
    const rows = assignments
      .filter((item) => item.status === ASSIGNMENT_STATUSES.CHECKED_IN)
      .map((item) => ({
        studentName: item.studentName,
        departmentName: item.departmentName,
        femaSid: item.femaSid,
        courseName: item.courseName,
        roomNumber: item.roomNumber,
        building: item.building,
        bedAssignment: item.bedAssignment,
        status: item.status,
        checkInDate: item.checkInDate,
        checkOutDate: item.checkOutDate,
        notes: item.notes,
      }));
    downloadHousingRosterCsv(rows, "checked-in-report.csv");
  }

  async function exportCheckOutReport() {
    if (!selectedClassId) return;
    const assignments = await listAssignmentsByClass(selectedClassId);
    const rows = assignments
      .filter((item) => item.status === ASSIGNMENT_STATUSES.CHECKED_OUT)
      .map((item) => ({
        studentName: item.studentName,
        departmentName: item.departmentName,
        femaSid: item.femaSid,
        courseName: item.courseName,
        roomNumber: item.roomNumber,
        building: item.building,
        bedAssignment: item.bedAssignment,
        status: item.status,
        checkInDate: item.checkInDate,
        checkOutDate: item.checkOutDate,
        notes: item.notes,
      }));
    downloadHousingRosterCsv(rows, "checked-out-report.csv");
  }

  async function handleSaveSettings(event) {
    event.preventDefault();
    if (!settings) return;
    setSavingSettings(true);
    try {
      await saveHousingSettings(settings, user?.uid ?? "system");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save housing settings.");
    } finally {
      setSavingSettings(false);
    }
  }

  const availableRooms = rooms.filter((room) => room.status === ROOM_STATUSES.ACTIVE);
  const maintenanceRooms = rooms.filter((room) => room.status === ROOM_STATUSES.MAINTENANCE);

  return (
    <>
      <PageHeader
        title="Housing Reports"
        subtitle="Export rosters, occupancy, and check-in status"
        actions={
          <Link
            to="/admin/housing"
            className="app-btn-secondary px-4 py-2 text-xs"
          >
            Housing classes
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading reports…</p>
        ) : (
          <>
            <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
              <h2 className="text-sm font-semibold">Class exports</h2>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-xs text-[var(--color-afta-muted)]">
                  Housing class
                  <select
                    value={selectedClassId}
                    onChange={(event) => setSelectedClassId(event.target.value)}
                    className="rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2 text-sm text-[var(--color-afta-text)]"
                  >
                    {classes.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.courseNumber} · {session.courseName}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={exportClassRoster}
                  className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
                >
                  Class housing roster (CSV)
                </button>
                <button
                  type="button"
                  onClick={exportCheckInReport}
                  className="app-btn-secondary px-4 py-2 text-xs"
                >
                  Check-in report
                </button>
                <button
                  type="button"
                  onClick={exportCheckOutReport}
                  className="app-btn-secondary px-4 py-2 text-xs"
                >
                  Check-out report
                </button>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
                <h2 className="text-sm font-semibold">Room inventory reports</h2>
                <p className="mt-2 text-sm text-[var(--color-afta-subtle)]">
                  {availableRooms.length} active · {maintenanceRooms.length} maintenance · {auditCount} audit
                  entries
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => downloadRoomReportCsv(availableRooms, "available")}
                    className="app-btn-secondary px-4 py-2 text-xs"
                  >
                    Available rooms CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadRoomReportCsv(maintenanceRooms, "maintenance")}
                    className="app-btn-secondary px-4 py-2 text-xs"
                  >
                    Maintenance rooms CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadRoomReportCsv(rooms, "occupancy")}
                    className="app-btn-secondary px-4 py-2 text-xs"
                  >
                    Full room inventory CSV
                  </button>
                </div>
              </div>

              <form
                className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5"
                onSubmit={handleSaveSettings}
              >
                <h2 className="text-sm font-semibold">Student housing instructions</h2>
                {settings ? (
                  <>
                    <textarea
                      value={settings.studentInstructions}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          studentInstructions: event.target.value,
                        }))
                      }
                      rows={5}
                      className="mt-4 w-full rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2 text-sm text-[var(--color-afta-text)]"
                    />
                    <textarea
                      value={settings.academyNotes}
                      onChange={(event) =>
                        setSettings((current) => ({ ...current, academyNotes: event.target.value }))
                      }
                      rows={3}
                      placeholder="Academy housing notes"
                      className="mt-3 w-full rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2 text-sm text-[var(--color-afta-text)]"
                    />
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="mt-4 rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                    >
                      {savingSettings ? "Saving…" : "Save instructions"}
                    </button>
                  </>
                ) : null}
              </form>
            </section>
          </>
        )}
      </div>
    </>
  );
}
