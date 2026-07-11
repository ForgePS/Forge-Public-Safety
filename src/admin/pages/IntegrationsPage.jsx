import { useState, useEffect } from "react";
import { useCms } from "../../cms/context/CmsContext.jsx";
import AdminPageHeader, { AdminInput, AdminCard, SaveBar, Toast } from "../components/AdminPageHeader.jsx";

const INTEGRATIONS = [
  { id: "google-analytics", name: "Google Analytics", fields: [{ key: "trackingId", label: "Tracking ID" }] },
  { id: "google-tag-manager", name: "Google Tag Manager", fields: [{ key: "containerId", label: "Container ID" }] },
  { id: "meta-pixel", name: "Meta Pixel", fields: [{ key: "pixelId", label: "Pixel ID" }] },
  { id: "webhook", name: "Webhook", fields: [{ key: "url", label: "Webhook URL" }, { key: "secret", label: "Secret (server-side only)" }] },
  { id: "zapier", name: "Zapier", fields: [{ key: "hookUrl", label: "Zapier Hook URL" }] },
];

export default function IntegrationsPage() {
  const { store, settings, refresh } = useCms();
  const [integrations, setIntegrations] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    store.getAll("integrations").then((list) => {
      const map = {};
      (Array.isArray(list) ? list : []).forEach((i) => { map[i.id] = i; });
      setIntegrations(map);
    });
  }, [store]);

  const updateIntegration = (id, key, value) => {
    setIntegrations({ ...integrations, [id]: { ...integrations[id], id, [key]: value, enabled: integrations[id]?.enabled ?? false } });
  };

  const save = async () => {
    setSaving(true);
    for (const integration of Object.values(integrations)) {
      await store.save("integrations", integration);
    }
    await refresh();
    setSaving(false);
    setToast("Integrations saved");
  };

  return (
    <div>
      <div className="p-8">
        <AdminPageHeader title="Integrations" description="Connect analytics, CRM, webhooks, and third-party services." />
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {INTEGRATIONS.map((int) => (
            <AdminCard key={int.id} title={int.name}>
              <label className="flex items-center gap-2 text-sm text-white mb-4">
                <input type="checkbox" checked={integrations[int.id]?.enabled} onChange={(e) => updateIntegration(int.id, "enabled", e.target.checked)} /> Enabled
              </label>
              {int.fields.map((field) => (
                <AdminInput key={field.key} label={field.label} value={integrations[int.id]?.[field.key] || ""} onChange={(v) => updateIntegration(int.id, field.key, v)} className="mb-3" help={field.key === "secret" ? "Stored server-side, never exposed to browser" : undefined} />
              ))}
            </AdminCard>
          ))}
        </div>
        <p className="mt-6 text-xs text-[#64748B]">Analytics IDs can also be configured in Settings. Sensitive credentials are stored server-side only.</p>
      </div>
      <SaveBar onSave={save} saving={saving} />
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
