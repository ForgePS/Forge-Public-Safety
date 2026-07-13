import { useState, useEffect } from "react";
import { useCms } from "../../cms/context/CmsContext.jsx";
import { restoreProgramWebsite, hardResetSiteFromDeployedSeed } from "../../cms/store/programImport.js";
import { compactLocalStore } from "../../cms/store/localStore.js";
import { DEFAULT_PROGRAM_ID } from "../../cms/core/programs.js";
import AdminPageHeader, { AdminInput, AdminTextarea, AdminCard, SaveBar, Toast, AdminButton } from "../components/AdminPageHeader.jsx";

export default function SettingsPage() {
  const { store, refresh, program, programId, setProgramId, pages } = useCms();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success");

  useEffect(() => {
    store.getAll("settings").then((s) => setSettings(s?.id ? s : (Array.isArray(s) ? s[0] : null)));
  }, [store]);

  const showToast = (message, type = "success") => {
    setToastType(type);
    setToast(message);
  };

  const save = async () => {
    setSaving(true);
    try {
      await store.save("settings", settings);
      await refresh();
      showToast("Settings saved");
    } catch (err) {
      showToast(err.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const restoreWebsite = async () => {
    if (!confirm(`Replace ${program?.name || "this program"} with the deployed website seed?`)) return;
    setRestoring(true);
    try {
      const result = await restoreProgramWebsite(programId);
      await refresh();
      showToast(`Restored ${result.pagesImported} pages from deployed seed (${result.source || "bundled"})`);
    } catch (err) {
      showToast(err.message || "Restore failed", "error");
    } finally {
      setRestoring(false);
    }
  };

  const hardReset = async () => {
    if (!confirm("Wipe ALL browser CMS data and reload the deployed website seed? This cannot be undone in this browser.")) return;
    setRestoring(true);
    try {
      const result = await hardResetSiteFromDeployedSeed();
      showToast(`Loaded ${result.pagesImported} pages from seed. Reloading…`);
      window.setTimeout(() => window.location.assign("/"), 600);
    } catch (err) {
      showToast(err.message || "Hard reset failed", "error");
      setRestoring(false);
    }
  };

  if (!settings) return <div className="p-8 text-[#64748B]">Loading...</div>;

  return (
    <div>
      <div className="p-8">
        <AdminPageHeader title="Website Settings" description="Business info, contact details, maintenance mode, analytics, and integrations." />

        <div className="mt-6 rounded-xl border border-[#F97316]/40 bg-[#F97316]/10 p-5">
          <p className="text-sm text-white font-medium mb-1">Site looks wrong / restore did nothing?</p>
          <p className="text-sm text-[#94A3B8] mb-4">
            Use <strong className="text-white">Hard reset from deployed seed</strong>. It clears this browser’s saved CMS data and reloads{" "}
            <code className="text-[#F97316]">/cms-seed.json</code> from Hosting. Ignore Import unless you have a backup file.
          </p>
          <div className="flex flex-wrap gap-2">
            <AdminButton onClick={hardReset} disabled={restoring}>
              {restoring ? "Resetting…" : "Hard reset from deployed seed"}
            </AdminButton>
            <AdminButton variant="secondary" onClick={restoreWebsite} disabled={restoring}>
              {restoring ? "Working…" : `Restore ${program?.name || "this program"} only`}
            </AdminButton>
            <AdminButton
              variant="secondary"
              onClick={() => {
                try {
                  compactLocalStore();
                  refresh();
                  showToast("Freed browser storage (cleared draft media & history)");
                } catch (err) {
                  showToast(err.message || "Could not free storage", "error");
                }
              }}
            >
              Free browser storage
            </AdminButton>
            {programId !== DEFAULT_PROGRAM_ID && (
              <AdminButton variant="secondary" onClick={() => setProgramId(DEFAULT_PROGRAM_ID)}>
                Switch to Forge Public Safety
              </AdminButton>
            )}
          </div>
          {pages.length === 0 && (
            <p className="text-sm text-[#F97316] mt-3">No pages loaded for this program right now.</p>
          )}
        </div>

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
        </div>
      </div>
      <SaveBar onSave={save} saving={saving} />
      <Toast message={toast} type={toastType} onClose={() => setToast("")} />
    </div>
  );
}
