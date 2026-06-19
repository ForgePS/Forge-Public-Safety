import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import { FormField, FormSection, FormSelect } from "../../components/StudentFormFields.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { listStudents } from "../../lib/students.js";
import { createTestingSeat, deleteTestingSeat, listTestingSeats } from "../../lib/testingSeats.js";
import { listTestingRooms } from "../../lib/testingRooms.js";
import { listTestingWindows } from "../../lib/testingWindows.js";

export default function AdminTestingSeatsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [windows, setWindows] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ testingWindowId: "", studentId: "", roomId: "", seatNumber: "", computerNumber: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function reload() {
    setRows(await listTestingSeats());
  }

  useEffect(() => {
    Promise.all([reload(), listTestingWindows().then(setWindows), listTestingRooms().then(setRooms), listStudents().then(setStudents)])
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load seat assignments."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    const student = students.find((item) => item.id === form.studentId);
    const room = rooms.find((item) => item.id === form.roomId);
    try {
      await createTestingSeat({
        ...form,
        studentName: student ? `${student.firstName} ${student.lastName}`.trim() : "",
        roomName: room?.roomName ?? "",
      }, user.uid);
      setForm({ testingWindowId: form.testingWindowId, studentId: "", roomId: "", seatNumber: "", computerNumber: "" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to assign seat.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Seat Assignments" subtitle="Assign students to testing room seats" actions={<Link to="/admin/testing" className="app-btn-secondary px-4 py-2 text-xs">Testing home</Link>} />
      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        {error ? <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        <form onSubmit={handleSubmit} className="rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm p-5">
          <FormSection title="Assign seat">
            <div className="grid gap-4 md:grid-cols-2">
              <FormSelect label="Testing window" name="testingWindowId" value={form.testingWindowId} onChange={(e) => setForm((p) => ({ ...p, testingWindowId: e.target.value }))} required>
                <option value="">Select window…</option>
                {windows.map((window) => <option key={window.id} value={window.id}>{window.testName} · {window.openDateTime}</option>)}
              </FormSelect>
              <FormSelect label="Student" name="studentId" value={form.studentId} onChange={(e) => setForm((p) => ({ ...p, studentId: e.target.value }))} required>
                <option value="">Select student…</option>
                {students.map((student) => <option key={student.id} value={student.id}>{student.lastName}, {student.firstName}</option>)}
              </FormSelect>
              <FormSelect label="Room" name="roomId" value={form.roomId} onChange={(e) => setForm((p) => ({ ...p, roomId: e.target.value }))} required>
                <option value="">Select room…</option>
                {rooms.map((room) => <option key={room.id} value={room.id}>{room.roomName}</option>)}
              </FormSelect>
              <FormField label="Seat number" name="seatNumber" value={form.seatNumber} onChange={(e) => setForm((p) => ({ ...p, seatNumber: e.target.value }))} />
              <FormField label="Computer number" name="computerNumber" value={form.computerNumber} onChange={(e) => setForm((p) => ({ ...p, computerNumber: e.target.value }))} />
            </div>
          </FormSection>
          <button type="submit" disabled={saving} className="mt-4 rounded-[10px] bg-[#c8102e] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">Assign seat</button>
        </form>
        <section className="overflow-hidden rounded-[14px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead><tr className="border-b border-[var(--color-afta-border)] text-[10px] uppercase text-[var(--color-afta-muted)]"><th className="px-4 py-3">Student</th><th className="px-4 py-3">Room</th><th className="px-4 py-3">Seat</th><th className="px-4 py-3">Computer</th><th className="px-4 py-3">Actions</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--color-afta-subtle)]">No seat assignments yet.</td></tr> : rows.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--color-afta-border)] text-[var(--color-afta-text)]">
                    <td className="px-4 py-3 text-[var(--color-afta-text)]">{row.studentName}</td>
                    <td className="px-4 py-3">{row.roomName}</td>
                    <td className="px-4 py-3">{row.seatNumber || "—"}</td>
                    <td className="px-4 py-3">{row.computerNumber || "—"}</td>
                    <td className="px-4 py-3"><button type="button" onClick={() => user && deleteTestingSeat(row.id, user.uid).then(reload)} className="text-xs text-[#c8102e]">Remove</button></td>
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
