import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useCms } from "../../cms/context/CmsContext.jsx";
import { createId } from "../../cms/core/ids.js";
import AdminPageHeader, { AdminInput, AdminButton, AdminCard, SaveBar, Toast } from "../components/AdminPageHeader.jsx";

export default function NavigationPage() {
  const { store, refresh } = useCms();
  const [nav, setNav] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    store.getAll("navigation").then((d) => setNav(d?.id ? d : (Array.isArray(d) ? d[0] : null)));
  }, [store]);

  const save = async () => {
    setSaving(true);
    await store.save("navigation", nav);
    await refresh();
    setSaving(false);
    setToast("Navigation saved");
  };

  if (!nav) return <div className="p-8 text-[#64748B]">Loading...</div>;

  const addMenuItem = () => {
    setNav({ ...nav, mainMenu: [...(nav.mainMenu || []), { id: createId("nav"), label: "New Item", href: "/", type: "internal", newTab: false, children: [] }] });
  };

  const updateItem = (id, key, value) => {
    setNav({ ...nav, mainMenu: nav.mainMenu.map((item) => item.id === id ? { ...item, [key]: value } : item) });
  };

  const removeItem = (id) => {
    setNav({ ...nav, mainMenu: nav.mainMenu.filter((item) => item.id !== id) });
  };

  return (
    <div>
      <div className="p-8">
        <AdminPageHeader title="Header & Navigation" description="Configure main menu, header buttons, announcement bar, and mobile navigation." />
        <div className="mt-8 space-y-6">
          <AdminCard title="Header Settings">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-white"><input type="checkbox" checked={nav.sticky !== false} onChange={(e) => setNav({ ...nav, sticky: e.target.checked })} /> Sticky header</label>
              <label className="flex items-center gap-2 text-sm text-white"><input type="checkbox" checked={nav.transparent} onChange={(e) => setNav({ ...nav, transparent: e.target.checked })} /> Transparent header</label>
              <AdminInput label="Phone Number" value={nav.phone} onChange={(v) => setNav({ ...nav, phone: v })} />
              <AdminInput label="Email" value={nav.email} onChange={(v) => setNav({ ...nav, email: v })} />
            </div>
          </AdminCard>

          <AdminCard title="Announcement Bar" actions={
            <label className="flex items-center gap-2 text-sm text-white"><input type="checkbox" checked={nav.announcementBar?.enabled} onChange={(e) => setNav({ ...nav, announcementBar: { ...nav.announcementBar, enabled: e.target.checked } })} /> Enabled</label>
          }>
            <div className="space-y-4">
              <AdminInput label="Text" value={nav.announcementBar?.text} onChange={(v) => setNav({ ...nav, announcementBar: { ...nav.announcementBar, text: v } })} />
              <AdminInput label="Link URL" value={nav.announcementBar?.link} onChange={(v) => setNav({ ...nav, announcementBar: { ...nav.announcementBar, link: v } })} />
              <AdminInput label="Link Label" value={nav.announcementBar?.linkLabel} onChange={(v) => setNav({ ...nav, announcementBar: { ...nav.announcementBar, linkLabel: v } })} />
            </div>
          </AdminCard>

          <AdminCard title="Main Menu" actions={<AdminButton onClick={addMenuItem}><Plus size={16} /> Add Item</AdminButton>}>
            <div className="space-y-3">
              {(nav.mainMenu || []).map((item) => (
                <div key={item.id} className="flex gap-3 items-start p-3 rounded-xl border border-[#1E293B]">
                  <div className="flex-1 grid gap-3 md:grid-cols-3">
                    <AdminInput label="Label" value={item.label} onChange={(v) => updateItem(item.id, "label", v)} />
                    <AdminInput label="Link" value={item.href} onChange={(v) => updateItem(item.id, "href", v)} />
                    <label className="flex items-center gap-2 text-sm text-[#94A3B8] pt-6"><input type="checkbox" checked={item.newTab} onChange={(e) => updateItem(item.id, "newTab", e.target.checked)} /> New tab</label>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="p-2 text-red-400 hover:text-red-300 mt-5"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </AdminCard>

          <AdminCard title="Header Buttons">
            <div className="space-y-3">
              {(nav.headerButtons || []).map((btn, i) => (
                <div key={btn.id} className="grid gap-3 md:grid-cols-3 p-3 rounded-xl border border-[#1E293B]">
                  <AdminInput label="Label" value={btn.label} onChange={(v) => {
                    const buttons = [...nav.headerButtons];
                    buttons[i] = { ...btn, label: v };
                    setNav({ ...nav, headerButtons: buttons });
                  }} />
                  <AdminInput label="Link" value={btn.href} onChange={(v) => {
                    const buttons = [...nav.headerButtons];
                    buttons[i] = { ...btn, href: v };
                    setNav({ ...nav, headerButtons: buttons });
                  }} />
                </div>
              ))}
            </div>
          </AdminCard>
        </div>
      </div>
      <SaveBar onSave={save} saving={saving} />
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
