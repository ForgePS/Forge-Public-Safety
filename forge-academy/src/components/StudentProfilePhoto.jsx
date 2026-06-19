import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Trash2, User } from "lucide-react";
import ProfilePhotoCropModal from "./ProfilePhotoCropModal.jsx";
import { PROFILE_PHOTO_SIZE } from "../lib/profilePhotoCrop.js";
import { removeStudentProfilePhoto, uploadStudentProfilePhoto } from "../lib/studentPhotos.js";

/**
 * @param {{
 *   studentId: string,
 *   profilePictureUrl?: string,
 *   displayName: string,
 *   editable?: boolean,
 *   size?: "md" | "lg",
 *   onPhotoChange?: (url: string) => void,
 * }} props
 */
export default function StudentProfilePhoto({
  studentId,
  profilePictureUrl = "",
  displayName,
  editable = false,
  size = "lg",
  onPhotoChange,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(profilePictureUrl);
  const [cropFile, setCropFile] = useState(null);

  useEffect(() => {
    setPhotoUrl(profilePictureUrl);
  }, [profilePictureUrl]);

  const dimension =
    size === "lg"
      ? { width: PROFILE_PHOTO_SIZE, height: PROFILE_PHOTO_SIZE }
      : { width: 80, height: 80 };
  const iconSize = size === "lg" ? "h-12 w-12" : "h-9 w-9";

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !studentId) return;

    setError(null);
    setCropFile(file);
  }

  async function handleCropSave(blob) {
    setUploading(true);
    setError(null);
    try {
      const url = await uploadStudentProfilePhoto(studentId, blob);
      setPhotoUrl(url);
      onPhotoChange?.(url);
      setCropFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload photo.");
      throw err;
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    if (!studentId || !window.confirm("Remove your profile photo?")) return;

    setUploading(true);
    setError(null);
    try {
      await removeStudentProfilePhoto(studentId);
      setPhotoUrl("");
      onPhotoChange?.("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove photo.");
    } finally {
      setUploading(false);
    }
  }

  const currentUrl = photoUrl || profilePictureUrl;

  return (
    <>
      <div className="flex flex-col items-start gap-3">
        <div className="relative">
          <div
            className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--color-afta-border)] bg-white text-[var(--color-afta-muted)]"
            style={{ width: dimension.width, height: dimension.height }}
          >
            {currentUrl ? (
              <img
                src={currentUrl}
                alt={displayName ? `${displayName} profile photo` : "Profile photo"}
                className="h-full w-full object-cover"
                width={dimension.width}
                height={dimension.height}
              />
            ) : (
              <User className={iconSize} aria-hidden="true" />
            )}
            {uploading ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/80">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--color-afta-text)]" />
              </div>
            ) : null}
          </div>

          {editable ? (
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

        {editable ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={uploading || Boolean(cropFile)}
              onClick={() => inputRef.current?.click()}
              className="rounded-full border border-[var(--color-afta-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-afta-subtle)] hover:text-[var(--color-afta-text)] disabled:opacity-60"
            >
              {currentUrl ? "Change photo" : "Upload photo"}
            </button>
            {currentUrl ? (
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

        {editable ? (
          <p className="max-w-xs text-[11px] text-[var(--color-afta-muted)]">
            JPG, PNG, WebP, or GIF · max 5 MB · cropped to {PROFILE_PHOTO_SIZE}×{PROFILE_PHOTO_SIZE}
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
