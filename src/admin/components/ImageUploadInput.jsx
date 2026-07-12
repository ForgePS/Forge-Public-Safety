import { useState, useRef } from "react";
import { Upload, Image as ImageIcon, FolderOpen, X, Loader2 } from "lucide-react";
import { useCms } from "../../cms/context/CmsContext.jsx";
import { uploadImage, isImageUrl } from "../../cms/store/mediaUpload.js";
import MediaPickerModal from "./MediaPickerModal.jsx";

export default function ImageUploadInput({
  label,
  value,
  onChange,
  help,
  required,
  className = "",
  allowUrl = true,
}) {
  const { store, programId } = useCms();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const item = await uploadImage(file, { store, programId });
      onChange(item.url);
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onFileInput = (e) => {
    const file = e.target.files?.[0];
    handleFile(file);
    e.target.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  const showPreview = value && isImageUrl(value);

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-white mb-1">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      {showPreview && (
        <div className="relative mb-3 rounded-xl border border-[#1E293B] overflow-hidden bg-[#0B1220]">
          <img src={value} alt="" className="w-full max-h-40 object-contain" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-white hover:bg-black"
            title="Remove image"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-xl border-2 border-dashed p-4 transition-colors ${
          dragOver ? "border-[#F97316] bg-[#F97316]/5" : "border-[#1E293B] bg-[#0B1220]/50"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold bg-[#F97316] hover:bg-[#ea580c] text-white disabled:opacity-50"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? "Uploading..." : "Upload from computer"}
          </button>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold bg-[#1E293B] hover:bg-[#334155] text-white"
          >
            <FolderOpen size={14} /> Media library
          </button>
          {!showPreview && (
            <span className="text-xs text-[#64748B] flex items-center gap-1">
              <ImageIcon size={12} /> or drag & drop an image here
            </span>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
          className="hidden"
          onChange={onFileInput}
        />
      </div>

      {allowUrl && (
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Or paste an image URL"
          className="mt-2 w-full rounded-xl bg-[#0B1220] border border-[#1E293B] px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#F97316]"
        />
      )}

      {help && <p className="text-xs text-[#64748B] mt-1">{help}</p>}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}

      {pickerOpen && (
        <MediaPickerModal
          onSelect={(url) => { onChange(url); setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

export function MediaListEditor({ label, value = [], onChange }) {
  const images = Array.isArray(value) ? value : [];

  const addUrl = (url) => {
    if (url) onChange([...images, url]);
  };

  const removeAt = (index) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-white mb-2">{label}</label>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {images.map((url, i) => (
          <div key={`${url}-${i}`} className="relative rounded-lg border border-[#1E293B] overflow-hidden aspect-square">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute top-1 right-1 p-1 rounded bg-black/70 text-white hover:bg-black"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
      <ImageUploadInput
        label="Add image"
        value=""
        onChange={addUrl}
        allowUrl={false}
        help="Upload or pick images to add to the gallery"
      />
    </div>
  );
}

export function SlidesEditor({ label, value = [], onChange }) {
  const slides = Array.isArray(value) ? value : [];

  const updateSlide = (index, key, val) => {
    const next = [...slides];
    next[index] = { ...next[index], [key]: val };
    onChange(next);
  };

  const addSlide = () => {
    onChange([...slides, { image: "", title: "", caption: "" }]);
  };

  const removeSlide = (index) => {
    onChange(slides.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-white mb-2">{label}</label>
      {slides.map((slide, i) => (
        <div key={i} className="mb-4 p-3 rounded-xl border border-[#1E293B] space-y-3">
          <ImageUploadInput
            label={`Slide ${i + 1} image`}
            value={slide.image}
            onChange={(v) => updateSlide(i, "image", v)}
          />
          <input
            value={slide.title || ""}
            onChange={(e) => updateSlide(i, "title", e.target.value)}
            placeholder="Title"
            className="w-full rounded-xl bg-[#0B1220] border border-[#1E293B] px-3 py-2 text-white text-sm"
          />
          <input
            value={slide.caption || ""}
            onChange={(e) => updateSlide(i, "caption", e.target.value)}
            placeholder="Caption"
            className="w-full rounded-xl bg-[#0B1220] border border-[#1E293B] px-3 py-2 text-white text-sm"
          />
          <button type="button" onClick={() => removeSlide(i)} className="text-xs text-red-400 hover:text-red-300">Remove slide</button>
        </div>
      ))}
      <button type="button" onClick={addSlide} className="text-sm text-[#F97316] hover:underline">+ Add slide</button>
    </div>
  );
}
