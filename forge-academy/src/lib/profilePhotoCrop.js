export const PROFILE_PHOTO_SIZE = 200;

/** @param {File} file */
export function validateProfileImageFile(file) {
  if (!file) throw new Error("Choose an image file.");
  const allowed = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
  if (!allowed.has(file.type)) {
    throw new Error("Use a JPG, PNG, WebP, or GIF image.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be 5 MB or smaller.");
  }
}

/** @param {File} file @returns {Promise<HTMLImageElement>} */
export function loadImageFromFile(file) {
  validateProfileImageFile(file);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to read that image."));
    };
    image.src = url;
  });
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement} image
 * @param {{ zoom: number, panX: number, panY: number }} transform
 * @param {number} [size]
 */
export function drawProfilePhotoPreview(ctx, image, { zoom, panX, panY }, size = PROFILE_PHOTO_SIZE) {
  ctx.clearRect(0, 0, size, size);
  const coverScale = Math.max(size / image.width, size / image.height);
  const scale = coverScale * zoom;
  const width = image.width * scale;
  const height = image.height * scale;
  const x = (size - width) / 2 + panX;
  const y = (size - height) / 2 + panY;
  ctx.drawImage(image, x, y, width, height);
}

/**
 * @param {HTMLImageElement} image
 * @param {{ zoom: number, panX: number, panY: number }} transform
 * @param {number} [size]
 * @returns {Promise<Blob>}
 */
export function renderProfilePhotoBlob(image, transform, size = PROFILE_PHOTO_SIZE) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to prepare photo preview.");

  drawProfilePhotoPreview(ctx, image, transform, size);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Unable to save cropped photo."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.92,
    );
  });
}
