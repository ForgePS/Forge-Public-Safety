import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { getClassSession, isHousingRequired, formatClassDates } from "../../lib/classes.js";
import {
  ASSIGNMENT_STATUSES,
  ASSIGNMENT_STATUS_LABELS,
  assignStudentToRoom,
  checkInAssignment,
  checkOutAssignment,
  listAssignmentsByClass,
  moveRoomAssignment,
  removeRoomAssignment,
} from "../../lib/roomAssignments.js";
import {
  buildClassHousingRoster,
  downloadHousingRosterCsv,
  printHousingRoster,
} from "../../lib/housingReports.js";
import {
  ROOM_STATUS_LABELS,
  ROOM_TYPE_LABELS,
  filterRooms,
  isRoomAssignable,
  listRooms,
} from "../../lib/rooms.js";

export default function AdminClassHousingPage() {
  const { classId } = useParams();
  const { user } = useAuth();
  const [classSession, setClassSession] = useState(null);
  const [roster, setRoster] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [bedAssignment, setBedAssignment] = useState("A");
  const [overrideReason, setOverrideReason] = useState("");
  const [roomSearch, setRoomSearch] = useState("");
  const [roomStatusFilter, setRoomStatusFilter] = useState("active");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function reload() {
    const [session, rosterRows, roomRows, assignmentRows] = await Promise.all([
      getClassSession(classId),
      buildClassHousingRoster(classId),
      listRooms(),
      listAssignmentsByClass(classId),
    ]);
    setClassSession(session);
    setRoster(rosterRows);
    setRooms(roomRows);
    setAssignments(assignmentRows);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    reload()
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Unable to load housing data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [classId]);

  const unassignedStudents = useMemo(
    () => roster.filter((row) => row.status === "unassigned"),
    [roster],
  );

  const filteredRooms = useMemo(
    () =>
      filterRooms(rooms, {
        search: roomSearch,
        status: roomStatusFilter === "all" ? undefined : roomStatusFilter,
      }).filter(isRoomAssignable),
    [rooms, roomSearch, roomStatusFilter],
  );

  const roomOccupancy = useMemo(() => {
    const map = new Map();
    for (const assignment of assignments) {
      if (![ASSIGNMENT_STATUSES.ASSIGNED, ASSIGNMENT_STATUSES.CHECKED_IN].includes(assignment.status)) {
        continue;
      }
      map.set(assignment.roomId, (map.get(assignment.roomId) ?? 0) + 1);
    }
    return map;
  }, [assignments]);

  async function handleAssign(event) {
    event.preventDefault();
    if (!user?.uid || !selectedStudentId || !selectedRoomId) return;

    setSaving(true);
    setError(null);
    try {
      await assignStudentToRoom({
        classId,
        studentId: selectedStudentId,
        roomId: selectedRoomId,
        bedAssignment,
        assignedByUid: user.uid,
        assignedByName: user.displayName,
        capacityOverrideReason: overrideReason,
      });
      setSelectedStudentId("");
      setSelectedRoomId("");
      setOverrideReason("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to assign room.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMove(assignmentId, roomId) {
    if (!user?.uid || !roomId) return;
    const reason = window.prompt("Capacity override reason (leave blank if room has space):", "");
    if (reason === null) return;

    setSaving(true);
    setError(null);
    try {
      await moveRoomAssignment(assignmentId, {
        roomId,
        assignedByUid: user.uid,
        assignedByName: user.displayName,
        capacityOverrideReason: reason,
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to move assignment.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(assignmentId) {
    if (!user?.uid || !window.confirm("Remove this room assignment?")) return;
    setSaving(true);
    try {
      await removeRoomAssignment(assignmentId, {
        assignedByUid: user.uid,
        assignedByName: user.displayName,
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove assignment.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCheckIn(assignmentId) {
    if (!user?.uid) return;
    setSaving(true);
    try {
      await checkInAssignment(assignmentId, { actorUid: user.uid, actorName: user.displayName });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to check in.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCheckOut(assignmentId) {
    if (!user?.uid) return;
    setSaving(true);
    try {
      await checkOutAssignment(assignmentId, { actorUid: user.uid, actorName: user.displayName });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to check out.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="grid flex-1 place-items-center text-[var(--color-afta-subtle)]">Loading housing roster…</div>;
  }

  if (!classSession) {
    return <div className="grid flex-1 place-items-center text-[var(--color-afta-subtle)]">Class not found.</div>;
  }

  if (!isHousingRequired(classSession)) {
    return (
      <div className="p-7">
        <p className="text-sm text-[var(--color-afta-subtle)]">
          Room assignment is disabled for this class. Set delivery type to on-campus housing required on the
          class form.
        </p>
        <Link to={`/admin/scheduling/${classId}`} className="mt-4 inline-block text-sm text-[#c8102e]">
          Edit class session →
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Class Housing Roster"
        subtitle={`${classSession.courseName} · ${formatClassDates(classSession)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                downloadHousingRosterCsv(
                  roster,
                  `${classSession.courseNumber}-housing-roster.csv`,
                )
              }
              className="app-btn-secondary px-4 py-2 text-xs"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() =>
                printHousingRoster(`${classSession.courseName} Housing Roster`, roster)
              }
              className="app-btn-secondary px-4 py-2 text-xs"
            >
              Print / PDF
            </button>
            <Link
              to="/admin/housing"
              className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
            >
              All housing classes
            </Link>
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
          <h2 className="mb-4 text-sm font-semibold">Assign room</h2>
          <form className="grid gap-3 lg:grid-cols-5" onSubmit={handleAssign}>
            <select
              value={selectedStudentId}
              onChange={(event) => setSelectedStudentId(event.target.value)}
              className="rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2 text-sm text-[var(--color-afta-text)]"
              required
            >
              <option value="">Select student needing room</option>
              {unassignedStudents.map((row) => (
                <option key={row.studentId} value={row.studentId}>
                  {row.studentName} · {row.departmentName}
                </option>
              ))}
            </select>
            <select
              value={selectedRoomId}
              onChange={(event) => setSelectedRoomId(event.target.value)}
              className="rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2 text-sm text-[var(--color-afta-text)]"
              required
            >
              <option value="">Select room</option>
              {filteredRooms.map((room) => {
                const occupied = roomOccupancy.get(room.id) ?? 0;
                return (
                  <option key={room.id} value={room.id}>
                    {room.roomNumber} · {occupied}/{room.capacity} · {room.building || "Main"}
                  </option>
                );
              })}
            </select>
            <select
              value={bedAssignment}
              onChange={(event) => setBedAssignment(event.target.value)}
              className="rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2 text-sm text-[var(--color-afta-text)]"
            >
              <option value="A">Bed A</option>
              <option value="B">Bed B</option>
            </select>
            <input
              type="text"
              value={overrideReason}
              onChange={(event) => setOverrideReason(event.target.value)}
              placeholder="Override reason if over capacity"
              className="rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2 text-sm text-[var(--color-afta-text)]"
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              Assign
            </button>
          </form>
        </section>

        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Housing roster</h2>
            <span className="text-xs text-[var(--color-afta-muted)]">
              {unassignedStudents.length} student(s) still need rooms
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase tracking-[0.06em] text-[var(--color-afta-muted)]">
                  <th className="px-3 py-2 font-semibold">Student</th>
                  <th className="px-3 py-2 font-semibold">Department</th>
                  <th className="px-3 py-2 font-semibold">FEMA SID</th>
                  <th className="px-3 py-2 font-semibold">Room</th>
                  <th className="px-3 py-2 font-semibold">Bed</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Check-in</th>
                  <th className="px-3 py-2 font-semibold">Check-out</th>
                  <th className="px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((row) => (
                  <tr key={row.studentId} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                    <td className="px-3 py-2">{row.studentName}</td>
                    <td className="px-3 py-2">{row.departmentName}</td>
                    <td className="px-3 py-2">{row.femaSid || "—"}</td>
                    <td className="px-3 py-2">{row.roomNumber}</td>
                    <td className="px-3 py-2">{row.bedAssignment}</td>
                    <td className="px-3 py-2">
                      {ASSIGNMENT_STATUS_LABELS[row.status] ?? row.status}
                    </td>
                    <td className="px-3 py-2">{row.checkInDate || "—"}</td>
                    <td className="px-3 py-2">{row.checkOutDate || "—"}</td>
                    <td className="px-3 py-2">
                      {row.assignmentId ? (
                        <div className="flex flex-wrap gap-2">
                          {row.status === ASSIGNMENT_STATUSES.ASSIGNED ? (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleCheckIn(row.assignmentId)}
                              className="text-[11px] font-semibold text-emerald-300"
                            >
                              Check in
                            </button>
                          ) : null}
                          {[ASSIGNMENT_STATUSES.ASSIGNED, ASSIGNMENT_STATUSES.CHECKED_IN].includes(
                            row.status,
                          ) ? (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleCheckOut(row.assignmentId)}
                              className="text-[11px] font-semibold text-amber-300"
                            >
                              Check out
                            </button>
                          ) : null}
                          <select
                            defaultValue=""
                            disabled={saving}
                            onChange={(event) => {
                              const roomId = event.target.value;
                              event.target.value = "";
                              if (roomId) handleMove(row.assignmentId, roomId);
                            }}
                            className="rounded border border-[var(--color-afta-border)] bg-white px-1 py-0.5 text-[11px] text-[var(--color-afta-text)]"
                          >
                            <option value="">Move to…</option>
                            {filteredRooms.map((room) => (
                              <option key={room.id} value={room.id}>
                                {room.roomNumber}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleRemove(row.assignmentId)}
                            className="text-[11px] font-semibold text-[#fca5a5]"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
          <div className="mb-4 flex flex-wrap gap-3">
            <input
              type="search"
              value={roomSearch}
              onChange={(event) => setRoomSearch(event.target.value)}
              placeholder="Filter available rooms…"
              className="rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2 text-sm text-[var(--color-afta-text)]"
            />
            <select
              value={roomStatusFilter}
              onChange={(event) => setRoomStatusFilter(event.target.value)}
              className="rounded-[10px] border border-[var(--color-afta-border)] bg-white px-3 py-2 text-sm text-[var(--color-afta-text)]"
            >
              <option value="active">Active</option>
              <option value="reserved">Reserved</option>
              <option value="all">All statuses</option>
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredRooms.map((room) => {
              const occupied = roomOccupancy.get(room.id) ?? 0;
              const full = occupied >= room.capacity;
              return (
                <div
                  key={room.id}
                  className={`rounded-[10px] border px-4 py-3 ${
                    full ? "border-amber-500/30 bg-amber-500/5" : "border-[var(--color-afta-border)] bg-white"
                  }`}
                >
                  <p className="font-semibold text-[var(--color-afta-text)]">Room {room.roomNumber}</p>
                  <p className="mt-1 text-xs text-[var(--color-afta-muted)]">
                    {room.building || "Main"} · Floor {room.floor || "—"} ·{" "}
                    {ROOM_TYPE_LABELS[room.roomType]} · {ROOM_STATUS_LABELS[room.status]}
                  </p>
                  <p className="mt-2 text-sm">
                    {occupied}/{room.capacity} occupied
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
