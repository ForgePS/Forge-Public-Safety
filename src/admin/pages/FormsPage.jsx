import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { useCms } from "../../cms/context/CmsContext.jsx";
import { createId } from "../../cms/core/ids.js";
import AdminPageHeader, { AdminInput, AdminTextarea, AdminButton, AdminCard, SaveBar, Toast } from "../components/AdminPageHeader.jsx";

export default function FormsPage() {
  const { forms, store, refresh } = useCms();
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const createForm = async () => {
    const form = {
      id: createId("form"),
      name: "New Form",
      description: "",
      fields: [{ id: createId("fld"), type: "text", label: "Name", name: "name", required: true, placeholder: "" }],
      settings: { multiStep: false, captcha: false, confirmationMessage: "Thank you!", redirectUrl: "", notificationEmails: [] },
      createdAt: new Date().toISOString(),
    };
    await store.save("forms", form);
    await refresh();
    setSelected(form);
  };

  const saveForm = async () => {
    if (!selected) return;
    setSaving(true);
    await store.save("forms", selected);
    await refresh();
    setSaving(false);
    setToast("Form saved");
  };

  const addField = () => {
    setSelected({
      ...selected,
      fields: [...selected.fields, { id: createId("fld"), type: "text", label: "New Field", name: `field_${Date.now()}`, required: false, placeholder: "" }],
    });
  };

  const updateField = (idx, key, value) => {
    const fields = [...selected.fields];
    fields[idx] = { ...fields[idx], [key]: value };
    setSelected({ ...selected, fields });
  };

  const removeField = (idx) => {
    setSelected({ ...selected, fields: selected.fields.filter((_, i) => i !== idx) });
  };

  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-[#1E293B] p-4">
        <AdminButton onClick={createForm} className="w-full mb-4"><Plus size={16} /> New Form</AdminButton>
        {forms.map((form) => (
          <button key={form.id} onClick={() => setSelected(JSON.parse(JSON.stringify(form)))} className={`w-full text-left p-3 rounded-xl mb-1 text-sm ${selected?.id === form.id ? "bg-[#F97316]/15 text-[#F97316]" : "text-[#94A3B8] hover:bg-white/5"}`}>
            {form.name}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <div>
            <div className="p-8">
              <AdminPageHeader
                title={selected.name}
                description="Configure form fields, validation, and submission settings."
                actions={
                  <Link to={`/admin/forms/${selected.id}/submissions`} className="text-sm text-[#F97316] hover:underline mr-4">View Submissions</Link>
                }
              />
              <div className="mt-6 space-y-6">
                <AdminCard title="Form Settings">
                  <div className="space-y-4">
                    <AdminInput label="Form Name" value={selected.name} onChange={(v) => setSelected({ ...selected, name: v })} />
                    <AdminTextarea label="Description" value={selected.description} onChange={(v) => setSelected({ ...selected, description: v })} />
                    <AdminInput label="Confirmation Message" value={selected.settings?.confirmationMessage} onChange={(v) => setSelected({ ...selected, settings: { ...selected.settings, confirmationMessage: v } })} />
                    <AdminInput label="Notification Emails" value={(selected.settings?.notificationEmails || []).join(", ")} onChange={(v) => setSelected({ ...selected, settings: { ...selected.settings, notificationEmails: v.split(",").map((e) => e.trim()).filter(Boolean) } })} help="Comma-separated email addresses" />
                    <AdminInput label="Redirect URL" value={selected.settings?.redirectUrl} onChange={(v) => setSelected({ ...selected, settings: { ...selected.settings, redirectUrl: v } })} />
                  </div>
                </AdminCard>
                <AdminCard title="Fields" actions={<AdminButton onClick={addField}><Plus size={16} /> Add Field</AdminButton>}>
                  <div className="space-y-3">
                    {selected.fields.map((field, i) => (
                      <div key={field.id} className="flex gap-3 p-3 rounded-xl border border-[#1E293B]">
                        <div className="flex-1 grid gap-3 md:grid-cols-4">
                          <AdminInput label="Label" value={field.label} onChange={(v) => updateField(i, "label", v)} />
                          <select value={field.type} onChange={(e) => updateField(i, "type", e.target.value)} className="rounded-xl bg-[#0B1220] border border-[#1E293B] px-3 py-2 text-white text-sm mt-5">
                            {["text", "email", "textarea", "select", "checkbox", "radio", "date", "file", "consent"].map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <AdminInput label="Placeholder" value={field.placeholder} onChange={(v) => updateField(i, "placeholder", v)} />
                          <label className="flex items-center gap-2 text-sm text-[#94A3B8] pt-6"><input type="checkbox" checked={field.required} onChange={(e) => updateField(i, "required", e.target.checked)} /> Required</label>
                        </div>
                        <button onClick={() => removeField(i)} className="p-2 text-red-400 hover:text-red-300 mt-5"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                </AdminCard>
              </div>
            </div>
            <SaveBar onSave={saveForm} saving={saving} />
          </div>
        ) : (
          <div className="p-8 text-[#64748B]">Select a form or create a new one.</div>
        )}
        <Toast message={toast} onClose={() => setToast("")} />
      </div>
    </div>
  );
}
