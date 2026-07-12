import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useCms } from "../../cms/context/CmsContext.jsx";
import { createId } from "../../cms/core/ids.js";
import AdminPageHeader, { AdminInput, AdminTextarea, AdminButton, AdminCard, SaveBar, Toast } from "../components/AdminPageHeader.jsx";
import AdminSplitLayout from "../components/AdminSplitLayout.jsx";
import LiveSitePreview from "../components/LiveSitePreview.jsx";
import ImageUploadInput from "../components/ImageUploadInput.jsx";

export default function FooterPage() {
  const { footers, store, refresh, branding, navigation } = useCms();
  const [footer, setFooter] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setFooter(footers[0] ? JSON.parse(JSON.stringify(footers[0])) : null);
  }, [footers]);

  const save = async () => {
    setSaving(true);
    await store.save("footers", footer);
    await refresh();
    setSaving(false);
    setToast("Footer saved");
  };

  if (!footer) return <div className="p-8 text-[#64748B]">Loading...</div>;

  const addColumn = () => {
    setFooter({ ...footer, columns: [...(footer.columns || []), { id: createId("col"), title: "New Column", type: "menu", links: [] }] });
  };

  const addLink = (colId) => {
    setFooter({
      ...footer,
      columns: footer.columns.map((col) => col.id === colId ? {
        ...col,
        links: [...(col.links || []), { id: createId("link"), label: "Link", href: "/", newTab: false }],
      } : col),
    });
  };

  const editor = (
    <div>
      <div className="p-8">
        <AdminPageHeader title="Footer Builder" description="Configure footer columns, links, and copyright. Preview updates in real time." />
        <div className="mt-8 space-y-6">
          <AdminCard title="Footer Content">
            <div className="space-y-4">
              <ImageUploadInput label="Logo" value={footer.logo} onChange={(v) => setFooter({ ...footer, logo: v })} />
              <AdminTextarea label="Blurb" value={footer.blurb} onChange={(v) => setFooter({ ...footer, blurb: v })} />
              <AdminInput label="Copyright Text" value={footer.copyright} onChange={(v) => setFooter({ ...footer, copyright: v })} />
              <AdminInput label="Background Color" value={footer.backgroundColor} onChange={(v) => setFooter({ ...footer, backgroundColor: v })} />
            </div>
          </AdminCard>

          <AdminCard title="Footer Columns" actions={<AdminButton onClick={addColumn}><Plus size={16} /> Add Column</AdminButton>}>
            <div className="space-y-4">
              {(footer.columns || []).map((col) => (
                <div key={col.id} className="p-4 rounded-xl border border-[#1E293B]">
                  <AdminInput label="Column Title" value={col.title} onChange={(v) => setFooter({ ...footer, columns: footer.columns.map((c) => c.id === col.id ? { ...c, title: v } : c) })} />
                  <div className="mt-3 space-y-2">
                    {(col.links || []).map((link, i) => (
                      <div key={link.id} className="flex gap-2">
                        <input value={link.label} onChange={(e) => {
                          const columns = footer.columns.map((c) => c.id === col.id ? { ...c, links: c.links.map((l, j) => j === i ? { ...l, label: e.target.value } : l) } : c);
                          setFooter({ ...footer, columns });
                        }} className="flex-1 rounded-lg bg-[#0B1220] border border-[#1E293B] px-3 py-1.5 text-white text-sm" placeholder="Label" />
                        <input value={link.href} onChange={(e) => {
                          const columns = footer.columns.map((c) => c.id === col.id ? { ...c, links: c.links.map((l, j) => j === i ? { ...l, href: e.target.value } : l) } : c);
                          setFooter({ ...footer, columns });
                        }} className="flex-1 rounded-lg bg-[#0B1220] border border-[#1E293B] px-3 py-1.5 text-white text-sm" placeholder="/href" />
                      </div>
                    ))}
                    <button onClick={() => addLink(col.id)} className="text-xs text-[#F97316] hover:underline">+ Add link</button>
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>

          <AdminCard title="Legal Links">
            <div className="space-y-2">
              {(footer.legalLinks || []).map((link, i) => (
                <div key={link.id} className="flex gap-2">
                  <input value={link.label} onChange={(e) => {
                    const legalLinks = [...footer.legalLinks];
                    legalLinks[i] = { ...link, label: e.target.value };
                    setFooter({ ...footer, legalLinks });
                  }} className="flex-1 rounded-lg bg-[#0B1220] border border-[#1E293B] px-3 py-1.5 text-white text-sm" />
                  <input value={link.href} onChange={(e) => {
                    const legalLinks = [...footer.legalLinks];
                    legalLinks[i] = { ...link, href: e.target.value };
                    setFooter({ ...footer, legalLinks });
                  }} className="flex-1 rounded-lg bg-[#0B1220] border border-[#1E293B] px-3 py-1.5 text-white text-sm" />
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

  const preview = (
    <LiveSitePreview
      branding={branding}
      navigation={navigation}
      footer={footer}
      label="Footer Preview"
      showChrome
    >
      <div className="py-32 px-8 text-center min-h-[300px]">
        <p className="text-xs uppercase tracking-wider text-[#64748B] mb-4">Page content area</p>
        <h2 className="text-2xl font-black text-white">Scroll down to see footer</h2>
      </div>
    </LiveSitePreview>
  );

  return <div className="h-full min-h-0"><AdminSplitLayout editor={editor} preview={preview} /></div>;
}
