import { useState, useEffect, useRef } from "react";
import { Trash2, Upload, Loader2 } from "lucide-react";
import { useCms } from "../../cms/context/CmsContext.jsx";
import { uploadImage } from "../../cms/store/mediaUpload.js";
import AdminPageHeader, { AdminButton, SaveBar, Toast } from "../components/AdminPageHeader.jsx";

export default function MediaPage() {
  const { store, refresh } = useCms();
  const [media, setMedia] = useState([]);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const loadMedia = () => {
    store.getAll("media").then((m) => setMedia(Array.isArray(m) ? m : []));
  };

  useEffect(() => {
    loadMedia();
  }, [store]);

  const handleFiles = async (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    setUploading(true);
    let uploaded = 0;
    try {
      for (const file of list) {
        const item = await uploadImage(file, { store });
        setMedia((prev) => [item, ...prev]);
        uploaded += 1;
      }
      setToast(`${uploaded} image${uploaded > 1 ? "s" : ""} uploaded`);
      await refresh();
    } catch (err) {
      setToast(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
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
        <AdminPageHeader
          title="Media Library"
          description="Upload images from your computer. Files are stored in Firebase Storage (production) or locally (dev)."
          actions={
            <AdminButton disabled={uploading} onClick={() => inputRef.current?.click()}>
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploading ? "Uploading..." : "Upload Images"}
            </AdminButton>
          }
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          className="mt-6 rounded-2xl border-2 border-dashed border-[#1E293B] p-8 text-center hover:border-[#334155] transition-colors"
        >
          <Upload size={32} className="mx-auto text-[#64748B] mb-3" />
          <p className="text-sm text-white font-medium">Drag & drop images here</p>
          <p className="text-xs text-[#64748B] mt-1">JPG, PNG, GIF, WebP, SVG — up to 10 MB each</p>
        </div>

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
                {item.size > 0 && <p className="text-[10px] text-[#64748B]">{(item.size / 1024).toFixed(0)} KB</p>}
                <input value={item.alt || ""} onChange={(e) => updateAlt(item.id, e.target.value)} placeholder="Alt text" className="mt-2 w-full rounded-lg bg-[#0B1220] border border-[#1E293B] px-2 py-1 text-white text-xs" />
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => navigator.clipboard.writeText(item.url)} className="text-xs text-[#F97316] hover:underline">Copy URL</button>
                  <button type="button" onClick={() => deleteMedia(item.id)} className="text-xs text-red-400 hover:underline"><Trash2 size={12} className="inline" /> Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && <p className="text-[#64748B] text-center py-12">No media files yet. Upload your first image above.</p>}
      </div>
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
