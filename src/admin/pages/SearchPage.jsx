import { useState, useEffect } from "react";
import { useCms } from "../../cms/context/CmsContext.jsx";
import AdminPageHeader, { AdminInput, AdminTextarea, AdminCard, SaveBar, Toast } from "../components/AdminPageHeader.jsx";

export default function SearchPage() {
  const { store, refresh } = useCms();
  const [search, setSearch] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    store.getAll("search").then((s) => setSearch(s?.id ? s : (Array.isArray(s) ? s[0] : { id: "default", enabled: true, placeholder: "Search...", noResultsMessage: "No results found." })));
  }, [store]);

  const save = async () => {
    setSaving(true);
    await store.save("search", search);
    await refresh();
    setSaving(false);
    setToast("Search settings saved");
  };

  if (!search) return <div className="p-8 text-[#64748B]">Loading...</div>;

  return (
    <div>
      <div className="p-8">
        <AdminPageHeader title="Search Settings" description="Configure site search, result customization, and analytics." />
        <AdminCard title="Search Configuration">
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm text-white"><input type="checkbox" checked={search.enabled !== false} onChange={(e) => setSearch({ ...search, enabled: e.target.checked })} /> Enable site search</label>
            <AdminInput label="Search Placeholder" value={search.placeholder} onChange={(v) => setSearch({ ...search, placeholder: v })} />
            <AdminTextarea label="No Results Message" value={search.noResultsMessage} onChange={(v) => setSearch({ ...search, noResultsMessage: v })} />
          </div>
        </AdminCard>
      </div>
      <SaveBar onSave={save} saving={saving} />
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
