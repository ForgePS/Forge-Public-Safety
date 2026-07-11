import { useState, useEffect } from "react";
import { useCms } from "../../cms/context/CmsContext.jsx";
import AdminPageHeader, { AdminCard } from "../components/AdminPageHeader.jsx";

export default function VersionsPage() {
  const { store } = useCms();
  const [versions, setVersions] = useState([]);

  useEffect(() => {
    store.getAll("versions").then((v) => setVersions(Array.isArray(v) ? v : []));
  }, [store]);

  return (
    <div className="p-8">
      <AdminPageHeader title="Version History" description="Track changes to pages, settings, and content with restore capability." />
      <AdminCard title="Recent Changes">
        <div className="space-y-3">
          {versions.slice(0, 50).map((v) => (
            <div key={v.id} className="flex items-center justify-between p-3 rounded-xl border border-[#1E293B]">
              <div>
                <p className="text-sm font-medium text-white">{v.summary || "Updated"}</p>
                <p className="text-xs text-[#64748B]">{v.resourceType} / {v.resourceId} — by {v.userId}</p>
              </div>
              <p className="text-xs text-[#64748B]">{v.createdAt ? new Date(v.createdAt).toLocaleString() : ""}</p>
            </div>
          ))}
          {versions.length === 0 && <p className="text-[#64748B] text-sm">No version history yet. Changes will be tracked automatically.</p>}
        </div>
      </AdminCard>
    </div>
  );
}
