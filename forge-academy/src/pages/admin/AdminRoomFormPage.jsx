import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField, FormSection, FormSelect, FormTextarea } from "../../components/StudentFormFields.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  ROOM_STATUSES,
  ROOM_STATUS_LABELS,
  ROOM_TYPES,
  ROOM_TYPE_LABELS,
  createRoom,
  getRoom,
  updateRoom,
} from "../../lib/rooms.js";

const emptyForm = {
  roomNumber: "",
  building: "",
  floor: "",
  capacity: "2",
  roomType: ROOM_TYPES.STANDARD,
  status: ROOM_STATUSES.ACTIVE,
  notes: "",
};

export default function AdminRoomFormPage() {
  const { roomId } = useParams();
  const isNew = !roomId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isNew) return;
    getRoom(roomId)
      .then((room) => {
        if (!room) throw new Error("Room not found.");
        setForm({
          roomNumber: room.roomNumber,
          building: room.building,
          floor: room.floor,
          capacity: String(room.capacity),
          roomType: room.roomType,
          status: room.status,
          notes: room.notes,
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load room."))
      .finally(() => setLoading(false));
  }, [roomId, isNew]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!user?.uid) return;

    setSaving(true);
    setError(null);
    try {
      const payload = {
        roomNumber: form.roomNumber,
        building: form.building,
        floor: form.floor,
        capacity: Number(form.capacity),
        roomType: form.roomType,
        status: form.status,
        notes: form.notes,
        actorUid: user.uid,
        actorName: user.displayName,
      };

      if (isNew) {
        const id = await createRoom(payload);
        navigate(`/admin/housing/rooms/${id}`);
      } else {
        await updateRoom(roomId, payload);
        navigate("/admin/housing/rooms");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save room.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="grid flex-1 place-items-center text-[var(--color-afta-subtle)]">Loading room…</div>;
  }

  return (
    <>
      <PageHeader
        title={isNew ? "Add Room" : `Edit Room ${form.roomNumber}`}
        subtitle="Campus housing inventory"
        actions={
          <Link
            to="/admin/housing/rooms"
            className="app-btn-secondary px-4 py-2 text-xs"
          >
            Back to rooms
          </Link>
        }
      />

      <form className="flex flex-1 flex-col gap-5 p-6 lg:p-7" onSubmit={handleSubmit}>
        {error ? (
          <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <FormSection title="Room details">
          <FormField
            label="Room number"
            name="roomNumber"
            value={form.roomNumber}
            onChange={handleChange}
            required
          />
          <FormField label="Building" name="building" value={form.building} onChange={handleChange} />
          <FormField label="Floor" name="floor" value={form.floor} onChange={handleChange} />
          <FormField
            label="Capacity"
            name="capacity"
            type="number"
            min="1"
            value={form.capacity}
            onChange={handleChange}
            required
          />
          <FormSelect
            label="Room type"
            name="roomType"
            value={form.roomType}
            onChange={handleChange}
            options={Object.entries(ROOM_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <FormSelect
            label="Status"
            name="status"
            value={form.status}
            onChange={handleChange}
            options={Object.entries(ROOM_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </FormSection>

        <section className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
          <FormTextarea label="Notes" name="notes" value={form.notes} onChange={handleChange} />
        </section>

        <button
          type="submit"
          disabled={saving}
          className="w-fit rounded-[10px] bg-[#c8102e] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : isNew ? "Create room" : "Save changes"}
        </button>
      </form>
    </>
  );
}
