import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useCms } from "../../cms/context/CmsContext.jsx";
import { createId } from "../../cms/core/ids.js";
import AdminPageHeader, { AdminInput, AdminButton, AdminCard, SaveBar, Toast } from "../components/AdminPageHeader.jsx";
import AdminSplitLayout from "../components/AdminSplitLayout.jsx";
import LiveSitePreview from "../components/LiveSitePreview.jsx";

function blankNav(programId) {
  return {
    id: programId,
    programId,
    sticky: true,
    transparent: false,
    announcementBar: {
      enabled: false,
      text: "",
      link: "",
      linkLabel: "",
      backgroundColor: "#F97316",
      textColor: "#FFFFFF",
    },
    mainMenu: [
      { id: createId("nav"), label: "Solutions", href: "/solutions", type: "internal", newTab: false, children: [] },
      {
        id: createId("nav"),
        label: "Products",
        href: "/products",
        type: "internal",
        newTab: false,
        children: [
          { id: createId("nav"), label: "All Products", href: "/products", type: "internal", newTab: false, children: [] },
          { id: createId("nav"), label: "Forge RMS", href: "/products/rms", type: "internal", newTab: false, children: [] },
          { id: createId("nav"), label: "Forge Industrial Safety", href: "/products/industrial-safety", type: "internal", newTab: false, children: [] },
          { id: createId("nav"), label: "Forge Academy", href: "/products/academy", type: "internal", newTab: false, children: [] },
        ],
      },
      { id: createId("nav"), label: "Resources", href: "/resources", type: "internal", newTab: false, children: [] },
      { id: createId("nav"), label: "Company", href: "/company", type: "internal", newTab: false, children: [] },
    ],
    headerButtons: [
      { id: createId("btn"), label: "Request Demo", href: "/contact", style: "primary", newTab: false },
    ],
    phone: "",
    email: "",
  };
}

export default function NavigationPage() {
  const { store, refresh, branding, footers, navigation, programId } = useCms();
  const [nav, setNav] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (navigation) {
      setNav(JSON.parse(JSON.stringify(navigation)));
      return;
    }
    store.getAll("navigation", programId).then((d) => {
      const loaded = Array.isArray(d) ? d[0] : d;
      setNav(loaded?.id ? JSON.parse(JSON.stringify(loaded)) : blankNav(programId));
    });
  }, [store, navigation, programId]);

  const save = async () => {
    setSaving(true);
    try {
      await store.save("navigation", { ...nav, id: programId, programId });
      await refresh();
      setToast("Header & navigation saved");
    } catch (err) {
      setToast(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!nav) return <div className="p-8 text-[#64748B]">Loading header settings...</div>;

  const addMenuItem = () => {
    setNav({
      ...nav,
      mainMenu: [
        ...(nav.mainMenu || []),
        { id: createId("nav"), label: "New Item", href: "/", type: "internal", newTab: false, children: [] },
      ],
    });
  };

  const updateItem = (id, key, value) => {
    setNav({
      ...nav,
      mainMenu: nav.mainMenu.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    });
  };

  const removeItem = (id) => {
    setNav({ ...nav, mainMenu: nav.mainMenu.filter((item) => item.id !== id) });
  };

  const addChild = (parentId) => {
    setNav({
      ...nav,
      mainMenu: nav.mainMenu.map((item) =>
        item.id === parentId
          ? {
              ...item,
              children: [
                ...(item.children || []),
                { id: createId("nav"), label: "New Link", href: "/products", type: "internal", newTab: false, children: [] },
              ],
            }
          : item
      ),
    });
  };

  const updateChild = (parentId, childId, key, value) => {
    setNav({
      ...nav,
      mainMenu: nav.mainMenu.map((item) =>
        item.id === parentId
          ? {
              ...item,
              children: (item.children || []).map((child) =>
                child.id === childId ? { ...child, [key]: value } : child
              ),
            }
          : item
      ),
    });
  };

  const removeChild = (parentId, childId) => {
    setNav({
      ...nav,
      mainMenu: nav.mainMenu.map((item) =>
        item.id === parentId
          ? { ...item, children: (item.children || []).filter((child) => child.id !== childId) }
          : item
      ),
    });
  };

  const addHeaderButton = () => {
    setNav({
      ...nav,
      headerButtons: [
        ...(nav.headerButtons || []),
        { id: createId("btn"), label: "New Button", href: "/contact", style: "primary", newTab: false },
      ],
    });
  };

  const editor = (
    <div>
      <div className="p-8">
        <AdminPageHeader
          title="Header & Navigation"
          description="Edit the site header menu, Products dropdown, and header buttons. Changes show live on the right and on the public site after Save."
        />
        <div className="mt-8 space-y-6">
          <AdminCard title="Header Settings">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-white">
                <input type="checkbox" checked={nav.sticky !== false} onChange={(e) => setNav({ ...nav, sticky: e.target.checked })} /> Sticky header
              </label>
              <label className="flex items-center gap-2 text-sm text-white">
                <input type="checkbox" checked={nav.transparent} onChange={(e) => setNav({ ...nav, transparent: e.target.checked })} /> Transparent header
              </label>
              <AdminInput label="Phone Number" value={nav.phone} onChange={(v) => setNav({ ...nav, phone: v })} />
              <AdminInput label="Email" value={nav.email} onChange={(v) => setNav({ ...nav, email: v })} />
            </div>
          </AdminCard>

          <AdminCard title="Announcement Bar" actions={
            <label className="flex items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={nav.announcementBar?.enabled}
                onChange={(e) => setNav({ ...nav, announcementBar: { ...nav.announcementBar, enabled: e.target.checked } })}
              /> Enabled
            </label>
          }>
            <div className="space-y-4">
              <AdminInput label="Text" value={nav.announcementBar?.text} onChange={(v) => setNav({ ...nav, announcementBar: { ...nav.announcementBar, text: v } })} />
              <AdminInput label="Link URL" value={nav.announcementBar?.link} onChange={(v) => setNav({ ...nav, announcementBar: { ...nav.announcementBar, link: v } })} />
              <AdminInput label="Link Label" value={nav.announcementBar?.linkLabel} onChange={(v) => setNav({ ...nav, announcementBar: { ...nav.announcementBar, linkLabel: v } })} />
            </div>
          </AdminCard>

          <AdminCard title="Main Menu" actions={<AdminButton onClick={addMenuItem}><Plus size={16} /> Add Item</AdminButton>}>
            <div className="space-y-4">
              {(nav.mainMenu || []).map((item) => (
                <div key={item.id} className="rounded-xl border border-[#1E293B] p-3 space-y-3">
                  <div className="flex gap-3 items-start">
                    <div className="flex-1 grid gap-3 md:grid-cols-3">
                      <AdminInput label="Label" value={item.label} onChange={(v) => updateItem(item.id, "label", v)} />
                      <AdminInput label="Link" value={item.href} onChange={(v) => updateItem(item.id, "href", v)} />
                      <label className="flex items-center gap-2 text-sm text-[#94A3B8] pt-6">
                        <input type="checkbox" checked={item.newTab} onChange={(e) => updateItem(item.id, "newTab", e.target.checked)} /> New tab
                      </label>
                    </div>
                    <button type="button" onClick={() => removeItem(item.id)} className="p-2 text-red-400 hover:text-red-300 mt-5"><Trash2 size={16} /></button>
                  </div>

                  <div className="rounded-lg border border-dashed border-[#334155] p-3 bg-[#0B1220]/50">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Dropdown links</p>
                      <AdminButton variant="ghost" onClick={() => addChild(item.id)}><Plus size={14} /> Add</AdminButton>
                    </div>
                    {(item.children || []).length === 0 && (
                      <p className="text-xs text-[#64748B]">No dropdown. Add links for Products (Forge RMS, Industrial Safety, Academy), etc.</p>
                    )}
                    <div className="space-y-2">
                      {(item.children || []).map((child) => (
                        <div key={child.id} className="flex gap-2 items-start">
                          <div className="flex-1 grid gap-2 md:grid-cols-2">
                            <AdminInput label="Label" value={child.label} onChange={(v) => updateChild(item.id, child.id, "label", v)} />
                            <AdminInput label="Link" value={child.href} onChange={(v) => updateChild(item.id, child.id, "href", v)} />
                          </div>
                          <button type="button" onClick={() => removeChild(item.id, child.id)} className="p-2 text-red-400 hover:text-red-300 mt-5"><Trash2 size={14} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>

          <AdminCard title="Header Buttons" actions={<AdminButton onClick={addHeaderButton}><Plus size={16} /> Add Button</AdminButton>}>
            <div className="space-y-3">
              {(nav.headerButtons || []).map((btn, i) => (
                <div key={btn.id} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] p-3 rounded-xl border border-[#1E293B]">
                  <AdminInput
                    label="Label"
                    value={btn.label}
                    onChange={(v) => {
                      const buttons = [...nav.headerButtons];
                      buttons[i] = { ...btn, label: v };
                      setNav({ ...nav, headerButtons: buttons });
                    }}
                  />
                  <AdminInput
                    label="Link"
                    value={btn.href}
                    onChange={(v) => {
                      const buttons = [...nav.headerButtons];
                      buttons[i] = { ...btn, href: v };
                      setNav({ ...nav, headerButtons: buttons });
                    }}
                  />
                  <button
                    type="button"
                    className="p-2 text-red-400 hover:text-red-300 mt-5"
                    onClick={() => setNav({ ...nav, headerButtons: nav.headerButtons.filter((b) => b.id !== btn.id) })}
                  >
                    <Trash2 size={16} />
                  </button>
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
      navigation={nav}
      footer={footers?.[0]}
      label="Header Preview"
    >
      <div className="py-24 px-8 text-center">
        <p className="text-xs uppercase tracking-wider text-[#64748B] mb-4">Page content area</p>
        <h2 className="text-3xl font-black text-white mb-4">Your page content appears here</h2>
        <p className="text-[#94A3B8] max-w-md mx-auto">The header above reflects your navigation changes instantly as you edit menu items and buttons.</p>
      </div>
    </LiveSitePreview>
  );

  return <div className="h-full min-h-0"><AdminSplitLayout editor={editor} preview={preview} /></div>;
}
