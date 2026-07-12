import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { useCms } from "../../cms/context/CmsContext.jsx";
import { createId } from "../../cms/core/ids.js";
import AdminPageHeader, { AdminInput, AdminTextarea, AdminButton, AdminCard, SaveBar, Toast } from "../components/AdminPageHeader.jsx";
import ImageUploadInput from "../components/ImageUploadInput.jsx";

export default function PopupsPage() {
  const { store, refresh } = useCms();
  const [popups, setPopups] = useState([]);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    store.getAll("popups").then((p) => setPopups(Array.isArray(p) ? p : []));
  }, [store]);

  const create = () => {
    const popup = { id: createId("popup"), name: "New Popup", type: "modal", enabled: false, content: "", startDate: "", endDate: "", displayFrequency: "once", priority: 0 };
    setPopups([...popups, popup]);
    setSelected(popup);
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    await store.save("popups", selected);
    await refresh();
    setSaving(false);
    setToast("Popup saved");
  };

  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-[#1E293B] p-4">
        <AdminButton onClick={create} className="w-full mb-4"><Plus size={16} /> New Popup</AdminButton>
        {popups.map((p) => (
          <button key={p.id} onClick={() => setSelected(JSON.parse(JSON.stringify(p)))} className={`w-full text-left p-3 rounded-xl mb-1 text-sm ${selected?.id === p.id ? "bg-[#F97316]/15 text-[#F97316]" : "text-[#94A3B8] hover:bg-white/5"}`}>{p.name}</button>
        ))}
      </div>
      <div className="flex-1">
        {selected ? (
          <div>
            <div className="p-8">
              <AdminPageHeader title={selected.name} description="Configure popups, banners, and announcement notices." />
              <AdminCard title="Popup Settings">
                <div className="space-y-4">
                  <AdminInput label="Name" value={selected.name} onChange={(v) => setSelected({ ...selected, name: v })} />
                  <select value={selected.type} onChange={(e) => setSelected({ ...selected, type: e.target.value })} className="w-full rounded-xl bg-[#0B1220] border border-[#1E293B] px-4 py-2.5 text-white text-sm">
                    <option value="modal">Modal Popup</option>
                    <option value="bar">Announcement Bar</option>
                  </select>
                  <AdminTextarea label="Content" value={selected.content} onChange={(v) => setSelected({ ...selected, content: v })} />
                  <ImageUploadInput label="Popup Image" value={selected.image} onChange={(v) => setSelected({ ...selected, image: v })} />
                  <AdminInput label="Button Label" value={selected.buttonLabel} onChange={(v) => setSelected({ ...selected, buttonLabel: v })} />
                  <AdminInput label="Button Link" value={selected.buttonHref} onChange={(v) => setSelected({ ...selected, buttonHref: v })} />
                  <AdminInput label="Start Date" type="datetime-local" value={selected.startDate?.slice(0, 16) || ""} onChange={(v) => setSelected({ ...selected, startDate: v ? new Date(v).toISOString() : "" })} />
                  <AdminInput label="End Date" type="datetime-local" value={selected.endDate?.slice(0, 16) || ""} onChange={(v) => setSelected({ ...selected, endDate: v ? new Date(v).toISOString() : "" })} />
                  <label className="flex items-center gap-2 text-sm text-white"><input type="checkbox" checked={selected.enabled} onChange={(e) => setSelected({ ...selected, enabled: e.target.checked })} /> Enabled</label>
                </div>
              </AdminCard>
            </div>
            <SaveBar onSave={save} saving={saving} />
          </div>
        ) : <div className="p-8 text-[#64748B]">Create or select a popup.</div>}
        <Toast message={toast} onClose={() => setToast("")} />
      </div>
    </div>
  );
}
