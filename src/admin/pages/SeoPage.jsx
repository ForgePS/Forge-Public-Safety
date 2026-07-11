import { useState, useEffect } from "react";
import { useCms } from "../../cms/context/CmsContext.jsx";
import AdminPageHeader, { AdminInput, AdminTextarea, AdminCard, SaveBar, Toast } from "../components/AdminPageHeader.jsx";

export default function SeoPage() {
  const { store, pages, refresh } = useCms();
  const [seo, setSeo] = useState(null);
  const [redirects, setRedirects] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    Promise.all([store.getAll("seoGlobal"), store.getAll("redirects")]).then(([s, r]) => {
      setSeo(s?.id ? s : (Array.isArray(s) ? s[0] : null));
      setRedirects(Array.isArray(r) ? r : []);
    });
  }, [store]);

  const save = async () => {
    setSaving(true);
    await store.save("seoGlobal", seo);
    for (const redirect of redirects) {
      await store.save("redirects", redirect);
    }
    await refresh();
    setSaving(false);
    setToast("SEO settings saved");
  };

  const missingMeta = pages.filter((p) => !p.seo?.description);
  const missingAlt = pages.filter((p) => p.sections?.some((s) => s.blocks?.some((b) => b.type === "image" && !b.content?.alt)));

  if (!seo) return <div className="p-8 text-[#64748B]">Loading...</div>;

  return (
    <div>
      <div className="p-8">
        <AdminPageHeader title="SEO Management" description="Global SEO defaults, robots.txt, sitemap, and redirects." />
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <AdminCard title="Global SEO Defaults">
            <div className="space-y-4">
              <AdminInput label="Default Title" value={seo.defaultTitle} onChange={(v) => setSeo({ ...seo, defaultTitle: v })} />
              <AdminInput label="Title Template" value={seo.titleTemplate} onChange={(v) => setSeo({ ...seo, titleTemplate: v })} help="Use {{page.title}} and {{site.name}}" />
              <AdminTextarea label="Default Description" value={seo.defaultDescription} onChange={(v) => setSeo({ ...seo, defaultDescription: v })} />
              <label className="flex items-center gap-2 text-sm text-white"><input type="checkbox" checked={seo.sitemapEnabled !== false} onChange={(e) => setSeo({ ...seo, sitemapEnabled: e.target.checked })} /> Enable sitemap</label>
            </div>
          </AdminCard>
          <AdminCard title="Robots.txt">
            <AdminTextarea value={seo.robotsTxt} onChange={(v) => setSeo({ ...seo, robotsTxt: v })} rows={8} />
          </AdminCard>
          <AdminCard title="301 Redirects">
            <div className="space-y-2">
              {redirects.map((r, i) => (
                <div key={r.id} className="flex gap-2">
                  <input value={r.from} onChange={(e) => { const next = [...redirects]; next[i] = { ...r, from: e.target.value }; setRedirects(next); }} className="flex-1 rounded-lg bg-[#0B1220] border border-[#1E293B] px-3 py-1.5 text-white text-sm" placeholder="/from" />
                  <span className="text-[#64748B] self-center">→</span>
                  <input value={r.to} onChange={(e) => { const next = [...redirects]; next[i] = { ...r, to: e.target.value }; setRedirects(next); }} className="flex-1 rounded-lg bg-[#0B1220] border border-[#1E293B] px-3 py-1.5 text-white text-sm" placeholder="/to" />
                </div>
              ))}
            </div>
          </AdminCard>
          <AdminCard title="SEO Warnings">
            {missingMeta.length > 0 && <p className="text-yellow-400 text-sm mb-2">{missingMeta.length} page(s) missing meta description</p>}
            {missingAlt.length > 0 && <p className="text-yellow-400 text-sm">{missingAlt.length} page(s) with images missing alt text</p>}
            {missingMeta.length === 0 && missingAlt.length === 0 && <p className="text-green-400 text-sm">No SEO warnings</p>}
          </AdminCard>
        </div>
      </div>
      <SaveBar onSave={save} saving={saving} />
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
