import { useState, useEffect } from "react";
import { useCms } from "../../cms/context/CmsContext.jsx";
import { restoreProgramWebsite } from "../../cms/store/programImport.js";
import { DEFAULT_PROGRAM_ID } from "../../cms/core/programs.js";
import AdminPageHeader, { AdminInput, AdminTextarea, AdminCard, SaveBar, Toast, AdminButton } from "../components/AdminPageHeader.jsx";

export default function SettingsPage() {
  const { store, refresh, program, programId, setProgramId, pages } = useCms();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
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

  const restoreWebsite = async () => {
    if (!confirm(`Restore the default website content for ${program?.name || "this program"}? This replaces pages and settings for this program only.`)) return;
    setRestoring(true);
    try {
      const result = await restoreProgramWebsite(programId);
      await refresh();
      setToast(`Restored ${result.pagesImported} pages for ${program?.name}`);
    } catch (err) {
      setToast(err.message || "Restore failed");
    } finally {
      setRestoring(false);
    }
  };

  if (!settings) return <div className="p-8 text-[#64748B]">Loading...</div>;

  return (
    <div>
      <div className="p-8">
        <AdminPageHeader title="Website Settings" description="Business info, contact details, maintenance mode, analytics, and integrations." />

        {(pages.length === 0 || programId !== DEFAULT_PROGRAM_ID) && (
          <div className="mt-6 rounded-xl border border-[#F97316]/30 bg-[#F97316]/10 p-4">
            <p className="text-sm text-white font-medium mb-2">Website missing or on the wrong program?</p>
            <p className="text-sm text-[#94A3B8] mb-4">
              {pages.length === 0
                ? `No pages are loaded for ${program?.name}. Restore the default site content below.`
                : `You are editing "${program?.name}". Your main marketing website is Forge Public Safety.`}
            </p>
            <div className="flex flex-wrap gap-2">
              {pages.length === 0 && (
                <AdminButton onClick={restoreWebsite} disabled={restoring}>
                  {restoring ? "Restoring..." : "Restore website for this program"}
                </AdminButton>
              )}
              {programId !== DEFAULT_PROGRAM_ID && (
                <AdminButton variant="secondary" onClick={() => setProgramId(DEFAULT_PROGRAM_ID)}>
                  Switch to Forge Public Safety
                </AdminButton>
              )}
            </div>
          </div>
        )}

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
          <AdminCard title="Restore website content">
            <p className="text-sm text-[#94A3B8] mb-4">
              Restores the default marketing pages for <strong className="text-white">{program?.name}</strong> only.
              Other programs are not affected. Local dev runs at{" "}
              <strong className="text-white">http://localhost:5173</strong>.
            </p>
            <AdminButton variant="secondary" onClick={restoreWebsite} disabled={restoring}>
              {restoring ? "Restoring..." : "Restore website for this program"}
            </AdminButton>
          </AdminCard>
        </div>
      </div>
      <SaveBar onSave={save} saving={saving} />
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
