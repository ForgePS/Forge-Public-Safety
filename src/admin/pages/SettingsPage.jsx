import { useState, useEffect } from "react";
import { useCms } from "../../cms/context/CmsContext.jsx";
import { seedLocalStore } from "../../cms/store/seed.js";
import { clearLocalStore } from "../../cms/store/localStore.js";
import AdminPageHeader, { AdminInput, AdminTextarea, AdminCard, SaveBar, Toast, AdminButton } from "../components/AdminPageHeader.jsx";

export default function SettingsPage() {
  const { store, refresh } = useCms();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    store.getAll("settings").then((s) => setSettings(s?.id ? s : (Array.isArray(s) ? s[0] : null)));
  }, [store]);

  const save = async () => {
    setSaving(true);
    await store.save("settings", settings);
    await refresh();
    setSaving(false);
    setToast("Settings saved");
  };

  const restoreDefaultContent = async () => {
    if (!confirm("Restore default website content for this program? Your current pages and settings will be replaced.")) return;
    clearLocalStore();
    seedLocalStore();
    await refresh();
    setToast("Default content restored — refresh the public site");
  };

  if (!settings) return <div className="p-8 text-[#64748B]">Loading...</div>;

  return (
    <div>
      <div className="p-8">
        <AdminPageHeader title="Website Settings" description="Business info, contact details, maintenance mode, analytics, and integrations." />
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <AdminCard title="Business Information">
            <div className="space-y-4">
              <AdminInput label="Business Name" value={settings.business?.name} onChange={(v) => setSettings({ ...settings, business: { ...settings.business, name: v } })} />
              <AdminInput label="Tagline" value={settings.business?.tagline} onChange={(v) => setSettings({ ...settings, business: { ...settings.business, tagline: v } })} />
              <AdminTextarea label="Description" value={settings.business?.description} onChange={(v) => setSettings({ ...settings, business: { ...settings.business, description: v } })} />
            </div>
          </AdminCard>
          <AdminCard title="Contact Information">
            <div className="space-y-4">
              <AdminInput label="Demo Email" value={settings.contact?.demoEmail} onChange={(v) => setSettings({ ...settings, contact: { ...settings.contact, demoEmail: v } })} />
              <AdminInput label="Privacy Email" value={settings.contact?.privacyEmail} onChange={(v) => setSettings({ ...settings, contact: { ...settings.contact, privacyEmail: v } })} />
              <AdminInput label="Phone" value={settings.contact?.phone} onChange={(v) => setSettings({ ...settings, contact: { ...settings.contact, phone: v } })} />
              <AdminInput label="Address" value={settings.contact?.address} onChange={(v) => setSettings({ ...settings, contact: { ...settings.contact, address: v } })} />
            </div>
          </AdminCard>
          <AdminCard title="Maintenance Mode">
            <label className="flex items-center gap-2 text-sm text-white mb-4"><input type="checkbox" checked={settings.maintenance?.enabled} onChange={(e) => setSettings({ ...settings, maintenance: { ...settings.maintenance, enabled: e.target.checked } })} /> Enable maintenance mode</label>
            <AdminTextarea label="Maintenance Message" value={settings.maintenance?.message} onChange={(v) => setSettings({ ...settings, maintenance: { ...settings.maintenance, message: v } })} />
          </AdminCard>
          <AdminCard title="Analytics & Tracking">
            <div className="space-y-4">
              <AdminInput label="Google Analytics ID" value={settings.analytics?.googleAnalyticsId} onChange={(v) => setSettings({ ...settings, analytics: { ...settings.analytics, googleAnalyticsId: v } })} />
              <AdminInput label="Google Tag Manager ID" value={settings.analytics?.googleTagManagerId} onChange={(v) => setSettings({ ...settings, analytics: { ...settings.analytics, googleTagManagerId: v } })} />
              <AdminInput label="Meta Pixel ID" value={settings.analytics?.metaPixelId} onChange={(v) => setSettings({ ...settings, analytics: { ...settings.analytics, metaPixelId: v } })} />
            </div>
          </AdminCard>
          <AdminCard title="Cookie Banner">
            <label className="flex items-center gap-2 text-sm text-white mb-4"><input type="checkbox" checked={settings.cookieBanner?.enabled} onChange={(e) => setSettings({ ...settings, cookieBanner: { ...settings.cookieBanner, enabled: e.target.checked } })} /> Enable cookie banner</label>
            <AdminTextarea label="Banner Text" value={settings.cookieBanner?.text} onChange={(v) => setSettings({ ...settings, cookieBanner: { ...settings.cookieBanner, text: v } })} />
          </AdminCard>
          <AdminCard title="Locale">
            <div className="space-y-4">
              <AdminInput label="Default Language" value={settings.locale?.defaultLanguage} onChange={(v) => setSettings({ ...settings, locale: { ...settings.locale, defaultLanguage: v } })} />
              <AdminInput label="Timezone" value={settings.locale?.timezone} onChange={(v) => setSettings({ ...settings, locale: { ...settings.locale, timezone: v } })} />
              <AdminInput label="Date Format" value={settings.locale?.dateFormat} onChange={(v) => setSettings({ ...settings, locale: { ...settings.locale, dateFormat: v } })} />
            </div>
          </AdminCard>
          <AdminCard title="Website not showing?">
            <p className="text-sm text-[#94A3B8] mb-4">
              If the public site is blank or shows 404, restore the default marketing content. Local dev runs at{" "}
              <strong className="text-white">http://localhost:5173</strong> (not port 80).
            </p>
            <AdminButton variant="secondary" onClick={restoreDefaultContent}>Restore default content</AdminButton>
          </AdminCard>
        </div>
      </div>
      <SaveBar onSave={save} saving={saving} />
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
