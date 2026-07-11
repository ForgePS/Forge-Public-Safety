import { useState } from "react";
import { Plus } from "lucide-react";
import { useCms } from "../../cms/context/CmsContext.jsx";
import { createId } from "../../cms/core/ids.js";
import AdminPageHeader, { AdminInput, AdminTextarea, AdminButton, AdminCard, SaveBar, Toast } from "../components/AdminPageHeader.jsx";

export default function CollectionsPage() {
  const { collections, store, refresh } = useCms();
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const createCollection = async () => {
    const col = {
      id: createId("col"),
      name: "New Collection",
      slug: "new-collection",
      fields: [{ key: "title", label: "Title", type: "text", required: true }, { key: "description", label: "Description", type: "textarea" }],
      entries: [],
    };
    await store.save("collections", col);
    await refresh();
    setSelected(col);
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    await store.save("collections", selected);
    await refresh();
    setSaving(false);
    setToast("Collection saved");
  };

  const addEntry = () => {
    setSelected({ ...selected, entries: [...(selected.entries || []), { id: createId("entry"), title: "New Entry", description: "", status: "published" }] });
  };

  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-[#1E293B] p-4">
        <AdminButton onClick={createCollection} className="w-full mb-4"><Plus size={16} /> New Collection</AdminButton>
        {collections.map((col) => (
          <button key={col.id} onClick={() => setSelected(JSON.parse(JSON.stringify(col)))} className={`w-full text-left p-3 rounded-xl mb-1 text-sm ${selected?.id === col.id ? "bg-[#F97316]/15 text-[#F97316]" : "text-[#94A3B8] hover:bg-white/5"}`}>
            {col.name} <span className="text-xs text-[#64748B]">({col.entries?.length || 0})</span>
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <div>
            <div className="p-8">
              <AdminPageHeader title={selected.name} description="Manage collection entries and custom fields." />
              <AdminCard title="Collection Settings">
                <div className="space-y-4">
                  <AdminInput label="Name" value={selected.name} onChange={(v) => setSelected({ ...selected, name: v })} />
                  <AdminInput label="Slug" value={selected.slug} onChange={(v) => setSelected({ ...selected, slug: v })} />
                </div>
              </AdminCard>
              <AdminCard title="Entries" actions={<AdminButton onClick={addEntry}><Plus size={16} /> Add Entry</AdminButton>}>
                <div className="space-y-3 mt-4">
                  {(selected.entries || []).map((entry, i) => (
                    <div key={entry.id} className="p-4 rounded-xl border border-[#1E293B] space-y-3">
                      {selected.fields?.map((field) => (
                        field.type === "textarea" ? (
                          <AdminTextarea key={field.key} label={field.label} value={entry[field.key]} onChange={(v) => {
                            const entries = [...selected.entries];
                            entries[i] = { ...entry, [field.key]: v };
                            setSelected({ ...selected, entries });
                          }} rows={2} />
                        ) : (
                          <AdminInput key={field.key} label={field.label} value={entry[field.key]} onChange={(v) => {
                            const entries = [...selected.entries];
                            entries[i] = { ...entry, [field.key]: v };
                            setSelected({ ...selected, entries });
                          }} />
                        )
                      ))}
                    </div>
                  ))}
                </div>
              </AdminCard>
            </div>
            <SaveBar onSave={save} saving={saving} />
          </div>
        ) : (
          <div className="p-8 text-[#64748B]">Select or create a collection.</div>
        )}
        <Toast message={toast} onClose={() => setToast("")} />
      </div>
    </div>
  );
}
