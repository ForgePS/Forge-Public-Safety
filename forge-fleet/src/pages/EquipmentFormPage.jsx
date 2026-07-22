import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import { FormField, FormSection, FormSelect, FormTextarea } from "../components/FormFields.jsx";
import {
  EQUIPMENT_CATEGORIES, EQUIPMENT_CATEGORY_LABELS, EQUIPMENT_STATUSES, EQUIPMENT_STATUS_LABELS,
  createEquipment, getEquipment, updateEquipment, deleteEquipment,
} from "../lib/equipment.js";
import { listDepartments } from "../lib/departments.js";
import { listStations } from "../lib/stations.js";
import { listApparatus } from "../lib/apparatus.js";

const emptyForm = {
  name: "", sku: "", serialNumber: "", category: EQUIPMENT_CATEGORIES.OTHER, status: EQUIPMENT_STATUSES.ACTIVE,
  departmentId: "", departmentName: "", stationId: "", stationName: "", apparatusId: "", apparatusName: "",
  manufacturer: "", model: "", purchaseDate: "", warrantyExpiry: "", quantity: "1", parLevel: "1",
  location: "", barcode: "", notes: "",
};

export default function EquipmentFormPage() {
  const { equipmentId } = useParams();
  const isNew = !equipmentId || equipmentId === "new";
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [departments, setDepartments] = useState([]);
  const [stations, setStations] = useState([]);
  const [apparatus, setApparatus] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([listDepartments(), listStations(), listApparatus()]).then(([d, s, a]) => {
      setDepartments(d); setStations(s); setApparatus(a);
    });
  }, []);

  useEffect(() => {
    if (isNew) return;
    getEquipment(equipmentId).then((e) => {
      if (!e) { setError("Not found."); setLoading(false); return; }
      setForm({
        name: e.name, sku: e.sku, serialNumber: e.serialNumber, category: e.category, status: e.status,
        departmentId: e.departmentId, departmentName: e.departmentName, stationId: e.stationId, stationName: e.stationName,
        apparatusId: e.apparatusId, apparatusName: e.apparatusName, manufacturer: e.manufacturer, model: e.model,
        purchaseDate: e.purchaseDate, warrantyExpiry: e.warrantyExpiry,
        quantity: String(e.quantity), parLevel: String(e.parLevel), location: e.location, barcode: e.barcode, notes: e.notes,
      });
      setLoading(false);
    });
  }, [isNew, equipmentId]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "departmentId") next.departmentName = departments.find((d) => d.id === value)?.name ?? "";
      if (name === "stationId") next.stationName = stations.find((s) => s.id === value)?.name ?? "";
      if (name === "apparatusId") next.apparatusName = apparatus.find((a) => a.id === value)?.name ?? "";
      return next;
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, quantity: Number(form.quantity), parLevel: Number(form.parLevel) };
      if (isNew) {
        const id = await createEquipment(payload);
        navigate(`/equipment/${id}`);
      } else {
        await updateEquipment(equipmentId, payload);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <>
      <PageHeader title={isNew ? "New Equipment" : `Edit ${form.name}`} backTo="/equipment" />
      <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 lg:p-7 space-y-6">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <FormSection title="Identification">
          <FormField label="Name" name="name" value={form.name} onChange={handleChange} required />
          <FormField label="SKU" name="sku" value={form.sku} onChange={handleChange} />
          <FormField label="Serial Number" name="serialNumber" value={form.serialNumber} onChange={handleChange} />
          <FormField label="Barcode" name="barcode" value={form.barcode} onChange={handleChange} />
          <FormSelect label="Category" name="category" value={form.category} onChange={handleChange} options={Object.entries(EQUIPMENT_CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
          <FormSelect label="Status" name="status" value={form.status} onChange={handleChange} options={Object.entries(EQUIPMENT_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
        </FormSection>
        <FormSection title="Location">
          <FormSelect label="Department" name="departmentId" value={form.departmentId} onChange={handleChange} options={[{ value: "", label: "— None —" }, ...departments.map((d) => ({ value: d.id, label: d.name }))]} />
          <FormSelect label="Station" name="stationId" value={form.stationId} onChange={handleChange} options={[{ value: "", label: "— None —" }, ...stations.map((s) => ({ value: s.id, label: s.name }))]} />
          <FormSelect label="Apparatus" name="apparatusId" value={form.apparatusId} onChange={handleChange} options={[{ value: "", label: "— None —" }, ...apparatus.map((a) => ({ value: a.id, label: `${a.unitNumber} — ${a.name}` }))]} />
          <FormField label="Location Detail" name="location" value={form.location} onChange={handleChange} />
        </FormSection>
        <FormSection title="Inventory">
          <FormField label="Quantity" name="quantity" type="number" value={form.quantity} onChange={handleChange} />
          <FormField label="Par Level" name="parLevel" type="number" value={form.parLevel} onChange={handleChange} />
          <FormField label="Manufacturer" name="manufacturer" value={form.manufacturer} onChange={handleChange} />
          <FormField label="Model" name="model" value={form.model} onChange={handleChange} />
          <FormField label="Purchase Date" name="purchaseDate" type="date" value={form.purchaseDate} onChange={handleChange} />
          <FormField label="Warranty Expiry" name="warrantyExpiry" type="date" value={form.warrantyExpiry} onChange={handleChange} />
        </FormSection>
        <FormSection title="Notes"><div className="sm:col-span-2"><FormTextarea label="Notes" name="notes" value={form.notes} onChange={handleChange} /></div></FormSection>
        <div className="flex gap-3">
          <button type="submit" className="app-btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          <Link to="/equipment" className="app-btn-secondary">Cancel</Link>
        </div>
      </form>
    </>
  );
}
