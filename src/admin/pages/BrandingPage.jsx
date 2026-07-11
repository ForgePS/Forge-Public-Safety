import { useState, useEffect } from "react";
import { useCms } from "../../cms/context/CmsContext.jsx";
import AdminPageHeader, { AdminInput, AdminCard, SaveBar, Toast } from "../components/AdminPageHeader.jsx";

function useSingletonEditor(key) {
  const { store, refresh } = useCms();
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    store.getAll(key).then((d) => setData(d?.id ? d : (Array.isArray(d) ? d[0] : null)));
  }, [key, store]);

  const save = async () => {
    setSaving(true);
    try {
      await store.save(key, data);
      await refresh();
      setToast("Saved successfully");
    } catch (err) {
      setToast(err.message);
    } finally {
      setSaving(false);
    }
  };

  return { data, setData, save, saving, toast, setToast };
}

export default function BrandingPage() {
  const { data, setData, save, saving, toast, setToast } = useSingletonEditor("branding");
  if (!data) return <div className="p-8 text-[#64748B]">Loading...</div>;

  const updateColor = (key, value) => setData({ ...data, colors: { ...data.colors, [key]: value } });
  const updateFont = (key, value) => setData({ ...data, fonts: { ...data.fonts, [key]: value } });
  const updateLogo = (key, value) => setData({ ...data, logos: { ...data.logos, [key]: value } });

  return (
    <div>
      <div className="p-8">
        <AdminPageHeader title="Global Branding" description="Manage logos, colors, fonts, and global styles applied across the entire website." />
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <AdminCard title="Company">
            <div className="space-y-4">
              <AdminInput label="Company Name" value={data.companyName} onChange={(v) => setData({ ...data, companyName: v })} />
              <AdminInput label="Tagline" value={data.tagline} onChange={(v) => setData({ ...data, tagline: v })} />
            </div>
          </AdminCard>
          <AdminCard title="Logos">
            <div className="space-y-4">
              <AdminInput label="Primary Logo URL" value={data.logos?.primary} onChange={(v) => updateLogo("primary", v)} />
              <AdminInput label="Alternate Logo" value={data.logos?.alternate} onChange={(v) => updateLogo("alternate", v)} />
              <AdminInput label="Dark Mode Logo" value={data.logos?.dark} onChange={(v) => updateLogo("dark", v)} />
              <AdminInput label="Light Mode Logo" value={data.logos?.light} onChange={(v) => updateLogo("light", v)} />
              <AdminInput label="Favicon URL" value={data.favicon} onChange={(v) => setData({ ...data, favicon: v })} />
            </div>
          </AdminCard>
          <AdminCard title="Colors">
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(data.colors || {}).map(([key, val]) => (
                <ColorInput key={key} label={key.replace(/([A-Z])/g, " $1")} value={val} onChange={(v) => updateColor(key, v)} />
              ))}
            </div>
          </AdminCard>
          <AdminCard title="Typography">
            <div className="space-y-4">
              <AdminInput label="Heading Font" value={data.fonts?.heading} onChange={(v) => updateFont("heading", v)} />
              <AdminInput label="Body Font" value={data.fonts?.body} onChange={(v) => updateFont("body", v)} />
              <AdminInput label="Heading Size" value={data.fonts?.headingSize} onChange={(v) => updateFont("headingSize", v)} />
              <AdminInput label="Body Size" value={data.fonts?.bodySize} onChange={(v) => updateFont("bodySize", v)} />
              <AdminInput label="Line Height" value={data.fonts?.lineHeight} onChange={(v) => updateFont("lineHeight", v)} />
            </div>
          </AdminCard>
          <AdminCard title="Global Styles">
            <div className="space-y-4">
              <AdminInput label="Border Radius" value={data.styles?.borderRadius} onChange={(v) => setData({ ...data, styles: { ...data.styles, borderRadius: v } })} />
              <AdminInput label="Container Width" value={data.styles?.containerWidth} onChange={(v) => setData({ ...data, styles: { ...data.styles, containerWidth: v } })} />
              <AdminInput label="Card Style Class" value={data.styles?.cardStyle} onChange={(v) => setData({ ...data, styles: { ...data.styles, cardStyle: v } })} />
            </div>
          </AdminCard>
        </div>
      </div>
      <SaveBar onSave={save} saving={saving} />
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}

function ColorInput({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs text-[#64748B] mb-1 capitalize">{label}</label>
      <div className="flex gap-2">
        <input type="color" value={value || "#000000"} onChange={(e) => onChange(e.target.value)} className="h-8 w-8 rounded cursor-pointer" />
        <input type="text" value={value || ""} onChange={(e) => onChange(e.target.value)} className="flex-1 rounded-lg bg-[#0B1220] border border-[#1E293B] px-2 py-1 text-white text-xs" />
      </div>
    </div>
  );
}
