import { useState, useEffect } from "react";
import { useCms } from "../../cms/context/CmsContext.jsx";
import AdminPageHeader, { AdminTextarea, AdminCard, SaveBar, Toast } from "../components/AdminPageHeader.jsx";

export default function CustomCodePage() {
  const { branding, store, settings, refresh } = useCms();
  const [css, setCss] = useState("");
  const [js, setJs] = useState("");
  const [headerScripts, setHeaderScripts] = useState("");
  const [footerScripts, setFooterScripts] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (branding) setCss(branding.customCss || "");
    if (settings) {
      setHeaderScripts(settings.scripts?.header || "");
      setFooterScripts(settings.scripts?.footer || "");
    }
  }, [branding, settings]);

  const save = async () => {
    setSaving(true);
    if (branding) {
      await store.save("branding", { ...branding, customCss: css, customJs: js });
    }
    if (settings) {
      await store.save("settings", { ...settings, scripts: { header: headerScripts, footer: footerScripts } });
    }
    await refresh();
    setSaving(false);
    setToast("Custom code saved");
  };

  return (
    <div>
      <div className="p-8">
        <AdminPageHeader title="Custom Code" description="Add global CSS, JavaScript, and tracking scripts. Use with caution." />
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-200 text-sm mb-8">
          Custom code can affect site functionality and security. Only users with appropriate permissions should edit these fields.
        </div>
        <div className="grid gap-6">
          <AdminCard title="Global CSS">
            <AdminTextarea value={css} onChange={setCss} rows={12} help="Applied site-wide via branding settings" />
          </AdminCard>
          <AdminCard title="Header Scripts">
            <AdminTextarea value={headerScripts} onChange={setHeaderScripts} rows={6} help="Injected in page head (analytics, verification codes)" />
          </AdminCard>
          <AdminCard title="Footer Scripts">
            <AdminTextarea value={footerScripts} onChange={setFooterScripts} rows={6} help="Injected before closing body tag" />
          </AdminCard>
        </div>
      </div>
      <SaveBar onSave={save} saving={saving} />
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
