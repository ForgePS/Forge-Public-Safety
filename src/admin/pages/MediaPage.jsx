import { useState, useEffect } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import { useCms } from "../../cms/context/CmsContext.jsx";
import { createId } from "../../cms/core/ids.js";
import AdminPageHeader, { AdminInput, AdminButton, SaveBar, Toast } from "../components/AdminPageHeader.jsx";

export default function MediaPage() {
  const { store, refresh } = useCms();
  const [media, setMedia] = useState([]);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    store.getAll("media").then((m) => setMedia(Array.isArray(m) ? m : []));
  }, [store]);

  const addMedia = () => {
    const url = prompt("Enter media URL:");
    if (!url) return;
    const item = {
      id: createId("media"),
      name: url.split("/").pop(),
      url,
      type: url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ? "image" : "file",
      alt: "",
      caption: "",
      size: 0,
      createdAt: new Date().toISOString(),
    };
    store.save("media", item).then(() => {
      setMedia((prev) => [...prev, item]);
      setToast("Media added");
    });
  };

  const updateAlt = async (id, alt) => {
    const item = media.find((m) => m.id === id);
    if (!item) return;
    const updated = { ...item, alt };
    await store.save("media", updated);
    setMedia((prev) => prev.map((m) => m.id === id ? updated : m));
  };

  const deleteMedia = async (id) => {
    if (!confirm("Delete this media file?")) return;
    await store.remove("media", id);
    setMedia((prev) => prev.filter((m) => m.id !== id));
    setToast("Media deleted");
  };

  const filtered = media.filter((m) => !search || m.name?.toLowerCase().includes(search.toLowerCase()) || m.alt?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="p-8">
        <AdminPageHeader title="Media Library" description="Upload, organize, and manage all website media files." actions={<AdminButton onClick={addMedia}><Plus size={16} /> Add Media</AdminButton>} />
        <div className="mt-6">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search media..." className="w-full max-w-md rounded-xl bg-[#111827] border border-[#1E293B] px-4 py-2.5 text-white text-sm" />
        </div>
        <div className="mt-6 grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) => (
            <div key={item.id} className="rounded-xl border border-[#1E293B] bg-[#111827] overflow-hidden">
              {item.type === "image" ? (
                <img src={item.url} alt={item.alt || item.name} className="w-full aspect-square object-cover" loading="lazy" />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center bg-[#0B1220] text-[#64748B]"><Upload size={32} /></div>
              )}
              <div className="p-3">
                <p className="text-sm font-medium text-white truncate">{item.name}</p>
                <input value={item.alt || ""} onChange={(e) => updateAlt(item.id, e.target.value)} placeholder="Alt text" className="mt-2 w-full rounded-lg bg-[#0B1220] border border-[#1E293B] px-2 py-1 text-white text-xs" />
                <div className="mt-2 flex gap-2">
                  <button onClick={() => navigator.clipboard.writeText(item.url)} className="text-xs text-[#F97316] hover:underline">Copy URL</button>
                  <button onClick={() => deleteMedia(item.id)} className="text-xs text-red-400 hover:underline"><Trash2 size={12} className="inline" /> Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && <p className="text-[#64748B] text-center py-12">No media files yet. Add your first file above.</p>}
      </div>
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
