import { useRef, useState } from "react";
import { Film, FileText, ImageIcon, Loader2, Upload, X } from "lucide-react";
import { createDigitalDashboardId } from "../../lib/digitalDashboard.js";
import {
  mediaTypeSupportsUpload,
  uploadDigitalDashboardMediaFile,
} from "../../lib/digitalDashboardMediaStorage.js";

/**
 * @param {{
 *   mediaType: string,
 *   mediaId?: string,
 *   url?: string,
 *   storagePath?: string,
 *   onUploaded: (payload: { url: string, storagePath: string, fileName?: string, mediaId?: string }) => void,
 *   onClear?: () => void,
 *   disabled?: boolean,
 * }} props
 */
export default function DigitalDashboardMediaUpload({
  mediaType,
  mediaId = "",
  url = "",
  storagePath = "",
  onUploaded,
  onClear,
  disabled = false,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  if (!mediaTypeSupportsUpload(mediaType)) {
    return (
      <p className="rounded-[10px] border border-dashed border-[var(--color-afta-border)] bg-slate-50 px-4 py-3 text-xs text-[var(--color-afta-muted)]">
        Upload is available for image, video, PDF, and PowerPoint types. Use the URL field for web or HTML content.
      </p>
    );
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const resolvedMediaId = mediaId || createDigitalDashboardId("DDM");
      const result = await uploadDigitalDashboardMediaFile(resolvedMediaId, file, mediaType);
      onUploaded({ ...result, mediaId: resolvedMediaId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload file.");
    } finally {
      setUploading(false);
    }
  }

  const Icon =
    mediaType === "video" ? Film : mediaType === "pdf" || mediaType === "office" ? FileText : ImageIcon;

  return (
    <div className="space-y-3 rounded-[12px] border border-[var(--color-afta-border)] bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-afta-muted)]">File upload</p>
          <p className="mt-1 text-xs text-[var(--color-afta-subtle)]">
            Files are stored in Firebase Storage and play on Signage Stick displays via secure download URL.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled || uploading}
          className="app-btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-60"
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Uploading…" : url ? "Replace file" : "Choose file"}
        </button>
        <input ref={inputRef} type="file" className="hidden" disabled={disabled || uploading} onChange={handleFileChange} />
      </div>

      {error ? <p className="app-error text-xs">{error}</p> : null}

      {url ? (
        <div className="flex flex-wrap items-start gap-4 rounded-[10px] border border-[var(--color-afta-border)] bg-white p-3">
          {mediaType === "image" ? (
            <img src={url} alt="Uploaded preview" className="h-24 w-32 rounded-[8px] border border-[var(--color-afta-border)] object-cover" />
          ) : (
            <span className="grid h-24 w-32 place-items-center rounded-[8px] border border-[var(--color-afta-border)] bg-slate-50 text-[var(--color-afta-red)]">
              <Icon className="h-8 w-8" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--color-afta-text)]">Uploaded asset ready</p>
            <p className="mt-1 break-all font-mono text-[10px] text-[var(--color-afta-muted)]">{storagePath || url}</p>
            {onClear ? (
              <button
                type="button"
                disabled={disabled || uploading}
                className="app-btn-secondary mt-2 inline-flex items-center gap-1 px-2 py-1 text-[10px]"
                onClick={onClear}
              >
                <X className="h-3 w-3" />
                Clear uploaded file
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
