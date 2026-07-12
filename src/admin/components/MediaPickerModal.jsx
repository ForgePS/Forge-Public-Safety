import { useState, useEffect, useRef } from "react";
import { X, Upload, Loader2, Search } from "lucide-react";
import { useCms } from "../../cms/context/CmsContext.jsx";
import { uploadImage } from "../../cms/store/mediaUpload.js";

export default function MediaPickerModal({ onSelect, onClose }) {
  const { store, programId } = useCms();
  const [media, setMedia] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    store.getAll("media").then((m) => {
      setMedia(Array.isArray(m) ? m.filter((item) => item.type === "image") : []);
      setLoading(false);
    });
  }, [store]);

  const filtered = media.filter((m) =>
    !search ||
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.alt?.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpload = async (file) => {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const item = await uploadImage(file, { store, programId });
      setMedia((prev) => [item, ...prev]);
      onSelect(item.url);
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-3xl max-h-[85vh] rounded-2xl border border-[#1E293B] bg-[#111827] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[#1E293B]">
          <h3 className="text-lg font-bold text-white">Media Library</h3>
          <button type="button" onClick={onClose} className="p-2 text-[#64748B] hover:text-white rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-[#1E293B] flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search images..."
              className="w-full rounded-xl bg-[#0B1220] border border-[#1E293B] pl-9 pr-4 py-2 text-white text-sm"
            />
          </div>
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold bg-[#F97316] hover:bg-[#ea580c] text-white disabled:opacity-50"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Upload new
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files?.[0])}
          />
        </div>

        {error && <p className="px-4 py-2 text-sm text-red-400">{error}</p>}

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-center text-[#64748B] py-12">Loading media...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-[#64748B] py-12">No images yet. Upload one above.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.url)}
                  className="rounded-xl border border-[#1E293B] overflow-hidden hover:border-[#F97316]/50 transition-colors text-left"
                >
                  <img src={item.url} alt={item.alt || item.name} className="w-full aspect-square object-cover" />
                  <p className="p-2 text-xs text-white truncate">{item.name}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
