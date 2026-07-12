import { useState, useEffect } from "react";
import { useCms } from "../../cms/context/CmsContext.jsx";
import AdminPageHeader, { AdminInput, AdminCard, SaveBar, Toast } from "../components/AdminPageHeader.jsx";
import AdminSplitLayout from "../components/AdminSplitLayout.jsx";
import LiveSitePreview, { BrandingPreviewSample } from "../components/LiveSitePreview.jsx";
import ImageUploadInput from "../components/ImageUploadInput.jsx";

function useSingletonEditor(key) {
  const { store, refresh, navigation, footers } = useCms();
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

  return { data, setData, save, saving, toast, setToast, navigation, footers };
}

export default function BrandingPage() {
  const { data, setData, save, saving, toast, setToast, navigation, footers } = useSingletonEditor("branding");
  if (!data) return <div className="p-8 text-[#64748B]">Loading...</div>;

  const updateColor = (key, value) => setData({ ...data, colors: { ...data.colors, [key]: value } });
  const updateFont = (key, value) => setData({ ...data, fonts: { ...data.fonts, [key]: value } });
  const updateLogo = (key, value) => setData({ ...data, logos: { ...data.logos, [key]: value } });

  const editor = (
    <div>
      <div className="p-8">
        <AdminPageHeader title="Global Branding" description="Manage logos, colors, fonts, and global styles. Preview updates in real time." />
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <AdminCard title="Company">
            <div className="space-y-4">
              <AdminInput label="Company Name" value={data.companyName} onChange={(v) => setData({ ...data, companyName: v })} />
              <AdminInput label="Tagline" value={data.tagline} onChange={(v) => setData({ ...data, tagline: v })} />
            </div>
          </AdminCard>
          <AdminCard title="Logos">
            <div className="space-y-4">
              <ImageUploadInput label="Primary Logo" value={data.logos?.primary} onChange={(v) => updateLogo("primary", v)} />
              <ImageUploadInput label="Alternate Logo" value={data.logos?.alternate} onChange={(v) => updateLogo("alternate", v)} />
              <ImageUploadInput label="Dark Mode Logo" value={data.logos?.dark} onChange={(v) => updateLogo("dark", v)} />
              <ImageUploadInput label="Light Mode Logo" value={data.logos?.light} onChange={(v) => updateLogo("light", v)} />
              <ImageUploadInput label="Favicon" value={data.favicon} onChange={(v) => setData({ ...data, favicon: v })} help="Small icon shown in browser tabs (32×32 or 64×64 recommended)" />
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

  const preview = (
    <LiveSitePreview
      branding={data}
      navigation={navigation}
      footer={footers?.[0]}
      label="Branding Preview"
    >
      <BrandingPreviewSample branding={data} />
    </LiveSitePreview>
  );

  return <AdminSplitLayout editor={editor} preview={preview} />;
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
