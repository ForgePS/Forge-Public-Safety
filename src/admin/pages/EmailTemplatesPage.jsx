import { useState, useEffect } from "react";
import { useCms } from "../../cms/context/CmsContext.jsx";
import AdminPageHeader, { AdminInput, AdminTextarea, AdminCard, SaveBar, Toast } from "../components/AdminPageHeader.jsx";

export default function EmailTemplatesPage() {
  const { store, refresh } = useCms();
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    store.getAll("emailTemplates").then((t) => {
      const list = Array.isArray(t) ? t : [];
      setTemplates(list);
      if (list.length) setSelected(JSON.parse(JSON.stringify(list[0])));
    });
  }, [store]);

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    await store.save("emailTemplates", selected);
    await refresh();
    setSaving(false);
    setToast("Template saved");
  };

  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-[#1E293B] p-4">
        {templates.map((t) => (
          <button key={t.id} onClick={() => setSelected(JSON.parse(JSON.stringify(t)))} className={`w-full text-left p-3 rounded-xl mb-1 text-sm ${selected?.id === t.id ? "bg-[#F97316]/15 text-[#F97316]" : "text-[#94A3B8] hover:bg-white/5"}`}>{t.name}</button>
        ))}
      </div>
      <div className="flex-1">
        {selected ? (
          <div>
            <div className="p-8">
              <AdminPageHeader title={selected.name} description="Edit email subject, body, and sender settings. Use {{variable}} placeholders." />
              <AdminCard title="Template">
                <div className="space-y-4">
                  <AdminInput label="Subject" value={selected.subject} onChange={(v) => setSelected({ ...selected, subject: v })} />
                  <AdminInput label="Sender Name" value={selected.senderName} onChange={(v) => setSelected({ ...selected, senderName: v })} />
                  <AdminInput label="Reply-To" value={selected.replyTo} onChange={(v) => setSelected({ ...selected, replyTo: v })} />
                  <AdminTextarea label="Body (HTML)" value={selected.body} onChange={(v) => setSelected({ ...selected, body: v })} rows={12} help="Variables: {{submission.name}}, {{submission.email}}, {{form.name}}, {{site.name}}" />
                </div>
              </AdminCard>
            </div>
            <SaveBar onSave={save} saving={saving} />
          </div>
        ) : <div className="p-8 text-[#64748B]">No templates.</div>}
        <Toast message={toast} onClose={() => setToast("")} />
      </div>
    </div>
  );
}
