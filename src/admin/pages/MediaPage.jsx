import { useState, useEffect, useRef } from "react";
import { Trash2, Upload, Loader2, Cloud, CloudOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useCms } from "../../cms/context/CmsContext.jsx";
import { uploadImage, MAX_LOCAL_BYTES, MAX_UPLOAD_BYTES } from "../../cms/store/mediaUpload.js";
import { getFirebaseStatus } from "../../cms/store/firebase.js";
import AdminPageHeader, { AdminButton, Toast } from "../components/AdminPageHeader.jsx";

export default function MediaPage() {
  const { store, refresh, programId } = useCms();
  const [media, setMedia] = useState([]);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);
  const firebaseStatus = getFirebaseStatus();
  const storageReady = firebaseStatus.storage;
  const maxLabel = storageReady
    ? `${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB`
    : `${Math.round(MAX_LOCAL_BYTES / 1024)} KB`;

  const loadMedia = () => {
    store.getAll("media").then((m) => setMedia(Array.isArray(m) ? m.filter((item) => item.type === "image") : []));
  };

  useEffect(() => {
    loadMedia();
  }, [store]);

  const showToast = (message, type = "success") => {
    setToastType(type);
    setToast(message);
  };

  const handleFiles = async (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    setUploading(true);
    let uploaded = 0;
    try {
      for (const file of list) {
        const item = await uploadImage(file, { store, programId });
        setMedia((prev) => [item, ...prev]);
        uploaded += 1;
      }
      showToast(`${uploaded} image${uploaded > 1 ? "s" : ""} uploaded${storageReady ? " to Firebase Storage" : " (browser storage)"}`);
      await refresh();
    } catch (err) {
      showToast(err.message || "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const updateAlt = async (id, alt) => {
    const item = media.find((m) => m.id === id);
    if (!item) return;
    const updated = { ...item, alt };
    await store.save("media", updated);
    setMedia((prev) => prev.map((m) => (m.id === id ? updated : m)));
  };

  const deleteMedia = async (id) => {
    if (!confirm("Delete this media file?")) return;
    await store.remove("media", id);
    setMedia((prev) => prev.filter((m) => m.id !== id));
    showToast("Media deleted");
  };

  const filtered = media.filter((m) =>
    !search
    || m.name?.toLowerCase().includes(search.toLowerCase())
    || m.alt?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="p-8">
        <AdminPageHeader
          title="Media Library"
          description={
            storageReady
              ? "Upload images to Firebase Storage (up to 10 MB each)."
              : "Firebase Storage is not connected in this build — uploads stay in the browser (500 KB limit)."
          }
          actions={
            <AdminButton disabled={uploading} onClick={() => inputRef.current?.click()}>
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploading ? "Uploading..." : "Upload Images"}
            </AdminButton>
          }
        />

        <div className={`mt-4 rounded-xl border px-4 py-3 flex flex-wrap items-start gap-3 ${
          storageReady
            ? "border-emerald-500/30 bg-emerald-500/10"
            : "border-amber-500/40 bg-amber-500/10"
        }`}>
          {storageReady ? (
            <Cloud size={18} className="text-emerald-400 mt-0.5 shrink-0" />
          ) : (
            <CloudOff size={18} className="text-amber-400 mt-0.5 shrink-0" />
          )}
          <div className="min-w-0 flex-1 text-sm">
            {storageReady ? (
              <p className="text-emerald-200">
                Firebase Storage connected ({firebaseStatus.projectId}). Uploads go to the cloud.
              </p>
            ) : (
              <>
                <p className="text-amber-100 font-medium">
                  Local browser storage limit is 500 KB per image.
                </p>
                <p className="text-amber-100/80 mt-1">
                  This site was built without <code className="text-white">VITE_FIREBASE_*</code> keys.
                  Add them in <code className="text-white">.env.local</code>, enable Anonymous Auth,
                  run <code className="text-white">npm run deploy:rules</code>, then rebuild/redeploy hosting.
                  See <code className="text-white">FIREBASE_STORAGE_SETUP.md</code> or{" "}
                  <Link to="/admin/settings" className="text-[#F97316] underline">Settings</Link>.
                </p>
              </>
            )}
          </div>
        </div>

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
          <p className="text-xs text-[#64748B] mt-1">JPG, PNG, GIF, WebP, SVG — up to {maxLabel} each</p>
        </div>

        <div className="mt-6">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search media..." className="w-full max-w-md rounded-xl bg-[#111827] border border-[#1E293B] px-4 py-2.5 text-white text-sm" />
        </div>
        <div className="mt-6 grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) => (
            <div key={item.id} className="rounded-xl border border-[#1E293B] bg-[#111827] overflow-hidden">
              {item.url ? (
                <img src={item.url} alt={item.alt || item.name} className="w-full aspect-square object-cover" loading="lazy" />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center bg-[#0B1220] text-[#64748B]"><Upload size={32} /></div>
              )}
              <div className="p-3">
                <p className="text-sm font-medium text-white truncate">{item.name}</p>
                {item.size > 0 && <p className="text-[10px] text-[#64748B]">{(item.size / 1024).toFixed(0)} KB{item.storageBackend === "firebase" ? " · cloud" : ""}</p>}
                <input value={item.alt || ""} onChange={(e) => updateAlt(item.id, e.target.value)} placeholder="Alt text" className="mt-2 w-full rounded-lg bg-[#0B1220] border border-[#1E293B] px-2 py-1 text-white text-xs" />
                <div className="mt-2 flex gap-2">
                  {item.url && <button type="button" onClick={() => navigator.clipboard.writeText(item.url)} className="text-xs text-[#F97316] hover:underline">Copy URL</button>}
                  <button type="button" onClick={() => deleteMedia(item.id)} className="text-xs text-red-400 hover:underline"><Trash2 size={12} className="inline" /> Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && <p className="text-[#64748B] text-center py-12">No media files yet. Upload your first image above.</p>}
      </div>
      <Toast message={toast} type={toastType} onClose={() => setToast("")} />
    </div>
  );
}
