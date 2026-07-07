import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import { FormField, FormSelect } from "../components/FormFields.jsx";
import ModuleFormRenderer from "../components/ModuleFormRenderer.jsx";
import { getMaintenanceModule, toModuleDefinition } from "../lib/maintenanceModules.js";
import { listApparatus } from "../lib/apparatus.js";
import { listEquipment } from "../lib/equipment.js";
import { createMaintenanceRecord } from "../lib/maintenanceRecords.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function PerformTemplatePage() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [module, setModule] = useState(null);
  const [apparatus, setApparatus] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [subjectId, setSubjectId] = useState("");
  const [values, setValues] = useState({});
  const [mileage, setMileage] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getMaintenanceModule(templateId), listApparatus(), listEquipment()]).then(([m, a, e]) => {
      if (!m) { setError("Template not found."); return; }
      setModule(m);
      setApparatus(a);
      setEquipment(e);
    });
  }, [templateId]);

  function handleValueChange(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!module) return;
    setSaving(true);
    setError(null);

    const isApparatus = module.subjectType === "apparatus";
    const subject = isApparatus
      ? apparatus.find((a) => a.id === subjectId)
      : equipment.find((eq) => eq.id === subjectId);

    if (!subject) {
      setError(`Select a ${module.subjectType}.`);
      setSaving(false);
      return;
    }

    const passFailFields = module.sections.flatMap((s) => (s.items ?? []).filter((f) => f.type === "pass_fail"));
    const allPassed = passFailFields.every((f) => values[f.key] === true);

    try {
      await createMaintenanceRecord({
        moduleId: templateId,
        moduleName: module.name,
        moduleKind: module.kind,
        apparatusId: isApparatus ? subjectId : "",
        apparatusName: isApparatus ? subject.name || subject.unitNumber : "",
        equipmentId: !isApparatus ? subjectId : "",
        equipmentName: !isApparatus ? subject.name : "",
        workOrderId: "",
        scheduleId: "",
        status: "submitted",
        performedBy: user?.uid ?? "",
        performedByName: user?.displayName ?? "",
        rmsPersonId: "",
        performedDate: new Date().toISOString().slice(0, 10),
        mileageAtService: Number(mileage) || (isApparatus ? subject.mileage : 0),
        hoursAtService: 0,
        values,
        notes,
        passed: allPassed,
      });
      navigate("/records");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed.");
    } finally {
      setSaving(false);
    }
  }

  if (error && !module) return <div className="p-6 text-red-600">{error}</div>;
  if (!module) return <div className="p-6">Loading…</div>;

  const subjects = module.subjectType === "apparatus" ? apparatus : equipment;
  const definition = toModuleDefinition(module);

  return (
    <>
      <PageHeader title={`Perform: ${module.name}`} subtitle={module.description} backTo={`/templates/${templateId}`} />
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 lg:p-7 space-y-6">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="app-panel grid gap-4 p-5 sm:grid-cols-2">
          <FormSelect
            label={module.subjectType === "apparatus" ? "Apparatus" : "Equipment"}
            name="subjectId"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            required
            options={[
              { value: "", label: "— Select —" },
              ...subjects.map((s) => ({
                value: s.id,
                label: s.unitNumber ? `${s.unitNumber} — ${s.name}` : s.name,
              })),
            ]}
          />
          {module.subjectType === "apparatus" ? (
            <FormField label="Mileage at Service" name="mileage" type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} />
          ) : null}
        </div>
        <div className="app-panel p-5">
          <ModuleFormRenderer definition={definition} values={values} onChange={handleValueChange} />
        </div>
        <div className="app-panel p-5">
          <label className="block">
            <span className="app-label">Notes</span>
            <textarea className="app-input min-h-[72px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
        <div className="flex gap-3">
          <button type="submit" className="app-btn-primary" disabled={saving}>{saving ? "Submitting…" : "Submit Record"}</button>
          <Link to={`/templates/${templateId}`} className="app-btn-secondary">Cancel</Link>
        </div>
      </form>
    </>
  );
}
