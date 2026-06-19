import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import PageHeader from "../../components/PageHeader.jsx";
import {
  ROOM_STATUS_LABELS,
  ROOM_TYPE_LABELS,
  filterRooms,
  listRooms,
} from "../../lib/rooms.js";

export default function AdminRoomsListPage() {
  const [rooms, setRooms] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    listRooms()
      .then(setRooms)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load rooms."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let rows = filterRooms(rooms, { search });
    if (statusFilter !== "all") {
      rows = rows.filter((room) => room.status === statusFilter);
    }
    return rows;
  }, [rooms, search, statusFilter]);

  return (
    <>
      <PageHeader
        title="Campus Rooms"
        subtitle="Manage room numbers, capacity, and availability"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/housing"
              className="app-btn-secondary px-4 py-2 text-xs"
            >
              Housing classes
            </Link>
            <Link
              to="/admin/housing/rooms/new"
              className="inline-flex items-center gap-2 rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white"
            >
              <Plus className="h-4 w-4" />
              Add room
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

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-afta-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search room number, building…"
              className="w-full rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--color-afta-text)] outline-none focus:border-[var(--color-afta-red)]/50"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-[10px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] px-3 py-2.5 text-sm text-[var(--color-afta-text)]"
          >
            <option value="all">All statuses</option>
            {Object.entries(ROOM_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-[var(--color-afta-subtle)]">Loading rooms…</p>
        ) : (
          <div className="overflow-x-auto rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase tracking-[0.06em] text-[var(--color-afta-muted)]">
                  <th className="px-4 py-3 font-semibold">Room</th>
                  <th className="px-4 py-3 font-semibold">Building</th>
                  <th className="px-4 py-3 font-semibold">Floor</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Capacity</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">
                      No rooms found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((room) => (
                    <tr key={room.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                      <td className="px-4 py-3 font-medium text-[var(--color-afta-text)]">{room.roomNumber}</td>
                      <td className="px-4 py-3">{room.building || "—"}</td>
                      <td className="px-4 py-3">{room.floor || "—"}</td>
                      <td className="px-4 py-3">{ROOM_TYPE_LABELS[room.roomType] ?? room.roomType}</td>
                      <td className="px-4 py-3">{room.capacity}</td>
                      <td className="px-4 py-3">{ROOM_STATUS_LABELS[room.status] ?? room.status}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/admin/housing/rooms/${room.id}`}
                          className="text-xs font-semibold text-[#c8102e] hover:underline"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
