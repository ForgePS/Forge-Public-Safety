import { useEffect, useRef, useState } from "react";
import { Loader2, X, ZoomIn } from "lucide-react";
import {
  drawProfilePhotoPreview,
  loadImageFromFile,
  PROFILE_PHOTO_SIZE,
  renderProfilePhotoBlob,
} from "../lib/profilePhotoCrop.js";

/**
 * @param {{
 *   file: File,
 *   onSave: (blob: Blob) => Promise<void> | void,
 *   onCancel: () => void,
 * }} props
 */
export default function ProfilePhotoCropModal({ file, onSave, onCancel }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const dragRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const image = await loadImageFromFile(file);
        if (!active) return;
        imageRef.current = image;
        setZoom(1);
        setPan({ x: 0, y: 0 });
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load image.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [file]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || loading) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawProfilePhotoPreview(ctx, image, { zoom, panX: pan.x, panY: pan.y });
  }, [loading, zoom, pan]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onCancel();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onCancel]);

  function handlePointerDown(event) {
    if (loading || saving) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  }

  function handlePointerMove(event) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    setPan({
      x: dragRef.current.panX + event.clientX - dragRef.current.startX,
      y: dragRef.current.panY + event.clientY - dragRef.current.startY,
    });
  }

  function handlePointerUp(event) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    dragRef.current = null;
  }

  async function handleSave() {
    const image = imageRef.current;
    if (!image) return;

    setSaving(true);
    setError(null);
    try {
      const blob = await renderProfilePhotoBlob(image, { zoom, panX: pan.x, panY: pan.y });
      await onSave(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save photo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[max(1rem,6vh)] sm:p-6">
      <button
        type="button"
        aria-label="Close photo editor"
        className="absolute inset-0 bg-[var(--color-afta-bg)]/80 backdrop-blur-[2px]"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-photo-crop-title"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-[18px] border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-afta-border)] px-5 py-4">
          <div>
            <h3 id="profile-photo-crop-title" className="text-sm font-semibold text-[var(--color-afta-text)]">
              Adjust profile photo
            </h3>
            <p className="mt-1 text-xs text-[var(--color-afta-muted)]">
              Drag to reposition · zoom before saving · saved at {PROFILE_PHOTO_SIZE}×
              {PROFILE_PHOTO_SIZE}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[var(--color-afta-border)] p-2 text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {error ? (
            <p className="rounded-[10px] border border-[#c8102e]/30 bg-[#c8102e]/10 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex justify-center">
            <div
              className={`relative overflow-hidden rounded-full border-2 border-[var(--color-afta-border)] bg-white shadow-lg ${
                loading || saving ? "opacity-70" : "cursor-grab active:cursor-grabbing"
              }`}
              style={{ width: PROFILE_PHOTO_SIZE, height: PROFILE_PHOTO_SIZE }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <canvas
                ref={canvasRef}
                width={PROFILE_PHOTO_SIZE}
                height={PROFILE_PHOTO_SIZE}
                className="block h-full w-full touch-none"
              />
              {loading || saving ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                  <Loader2 className="h-7 w-7 animate-spin text-[var(--color-afta-text)]" />
                </div>
              ) : null}
            </div>
          </div>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-afta-muted)]">
              <ZoomIn className="h-3.5 w-3.5" />
              Zoom
            </span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              disabled={loading || saving}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="w-full accent-[#c8102e] disabled:opacity-50"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={loading || saving}
              onClick={handleSave}
              className="rounded-full bg-[#c8102e] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save photo"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onCancel}
              className="rounded-full border border-[var(--color-afta-border)] px-5 py-2.5 text-sm font-semibold text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)] disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
