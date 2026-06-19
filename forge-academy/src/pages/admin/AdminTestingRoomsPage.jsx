import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField, FormSection } from "../../components/StudentFormFields.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { createTestingRoom, listTestingRooms, updateTestingRoom } from "../../lib/testingRooms.js";

export default function AdminTestingRoomsPage() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState({ roomName: "", roomNumber: "", capacity: "20", active: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function reload() {
    setRooms(await listTestingRooms(true));
  }

  useEffect(() => {
    reload().catch((err) => setError(err instanceof Error ? err.message : "Unable to load rooms.")).finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await createTestingRoom({ ...form, capacity: Number(form.capacity) }, user.uid);
      setForm({ roomName: "", roomNumber: "", capacity: "20", active: true });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create room.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(room) {
    if (!user) return;
    await updateTestingRoom(room.id, { active: !room.active }, user.uid);
    await reload();
  }

  return (
    <>
      <PageHeader title="Testing Rooms" subtitle="Computer lab rooms and seating capacity" actions={<Link to="/admin/testing" className="app-btn-secondary px-4 py-2 text-xs">Testing home</Link>} />
      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        <form onSubmit={handleSubmit} className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
          <FormSection title="New testing room">
            <div className="grid gap-4 md:grid-cols-3">
              <FormField label="Room name" name="roomName" value={form.roomName} onChange={(e) => setForm((p) => ({ ...p, roomName: e.target.value }))} required />
              <FormField label="Room number" name="roomNumber" value={form.roomNumber} onChange={(e) => setForm((p) => ({ ...p, roomNumber: e.target.value }))} />
              <FormField label="Capacity" name="capacity" value={form.capacity} onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))} />
            </div>
          </FormSection>
          <button type="submit" disabled={saving} className="mt-4 rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">Add room</button>
        </form>
        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead><tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]"><th className="px-4 py-3">Room</th><th className="px-4 py-3">Number</th><th className="px-4 py-3">Capacity</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">Loading…</td></tr> : rooms.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">No testing rooms yet.</td></tr> : rooms.map((room) => (
                  <tr key={room.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                    <td className="px-4 py-3 text-[var(--color-afta-text)]">{room.roomName}</td>
                    <td className="px-4 py-3">{room.roomNumber || "—"}</td>
                    <td className="px-4 py-3">{room.capacity}</td>
                    <td className="px-4 py-3">{room.active ? "Active" : "Inactive"}</td>
                    <td className="px-4 py-3"><button type="button" onClick={() => toggleActive(room)} className="text-xs text-[#c8102e]">{room.active ? "Deactivate" : "Activate"}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
