import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Trash2, User } from "lucide-react";
import ProfilePhotoCropModal from "./ProfilePhotoCropModal.jsx";
import { PROFILE_PHOTO_SIZE } from "../lib/profilePhotoCrop.js";
import {
  removePortalUserProfilePhoto,
  uploadPortalUserProfilePhoto,
} from "../lib/portalUserPhotos.js";

/**
 * @param {{
 *   userId?: string,
 *   photoUrl?: string,
 *   displayName?: string,
 *   disabled?: boolean,
 *   onPhotoChange?: (url: string) => void,
 *   onPendingPhoto?: (blob: Blob | null) => void,
 * }} props
 */
export default function PortalUserProfilePhoto({
  userId = "",
  photoUrl = "",
  displayName = "",
  disabled = false,
  onPhotoChange,
  onPendingPhoto,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(photoUrl);
  const [cropFile, setCropFile] = useState(null);

  useEffect(() => {
    setPreviewUrl(photoUrl);
  }, [photoUrl]);

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || disabled) return;
    setError(null);
    setCropFile(file);
  }

  async function handleCropSave(blob) {
    setUploading(true);
    setError(null);
    try {
      if (userId) {
        const url = await uploadPortalUserProfilePhoto(userId, blob);
        setPreviewUrl(url);
        onPhotoChange?.(url);
        onPendingPhoto?.(null);
      } else {
        const localUrl = URL.createObjectURL(blob);
        setPreviewUrl(localUrl);
        onPendingPhoto?.(blob);
        onPhotoChange?.("");
      }
      setCropFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload photo.");
      throw err;
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    if (disabled || !window.confirm("Remove this profile photo?")) return;

    setUploading(true);
    setError(null);
    try {
      if (userId) {
        await removePortalUserProfilePhoto(userId);
      }
      setPreviewUrl("");
      onPhotoChange?.("");
      onPendingPhoto?.(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove photo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div className="flex flex-col items-start gap-3">
        <div className="relative">
          <div
            className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--color-afta-border)] bg-white text-[var(--color-afta-muted)]"
            style={{ width: PROFILE_PHOTO_SIZE, height: PROFILE_PHOTO_SIZE }}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={displayName ? `${displayName} profile photo` : "Profile photo"}
                className="h-full w-full object-cover"
                width={PROFILE_PHOTO_SIZE}
                height={PROFILE_PHOTO_SIZE}
              />
            ) : (
              <User className="h-12 w-12" aria-hidden="true" />
            )}
            {uploading ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/80">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--color-afta-text)]" />
              </div>
            ) : null}
          </div>

          {!disabled ? (
            <button
              type="button"
              disabled={uploading || Boolean(cropFile)}
              onClick={() => inputRef.current?.click()}
              className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-afta-border)] bg-[var(--color-afta-surface)] text-[var(--color-afta-text)] hover:border-[#c8102e]/50 disabled:opacity-60"
              aria-label="Change profile photo"
            >
              <Camera className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {!disabled ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={uploading || Boolean(cropFile)}
              onClick={() => inputRef.current?.click()}
              className="rounded-full border border-[var(--color-afta-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)] disabled:opacity-60"
            >
              {previewUrl ? "Change photo" : "Upload photo"}
            </button>
            {previewUrl ? (
              <button
                type="button"
                disabled={uploading || Boolean(cropFile)}
                onClick={handleRemove}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-afta-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-afta-subtle)] hover:text-red-700 disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            ) : null}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : null}

        {!disabled ? (
          <p className="max-w-sm text-[11px] text-[var(--color-afta-muted)]">
            JPG, PNG, WebP, or GIF · max 5 MB · cropped to {PROFILE_PHOTO_SIZE}×{PROFILE_PHOTO_SIZE}
            {!userId ? " · photo uploads after you create the account" : null}
          </p>
        ) : null}

        {error ? <p className="text-xs text-red-700">{error}</p> : null}
      </div>

      {cropFile ? (
        <ProfilePhotoCropModal
          file={cropFile}
          onSave={handleCropSave}
          onCancel={() => setCropFile(null)}
        />
      ) : null}
    </>
  );
}
