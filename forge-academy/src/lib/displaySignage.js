/** Fixed signage canvas used by the public display player. */
export const SIGNAGE_WIDTH = 1920;
export const SIGNAGE_HEIGHT = 1080;

/** @param {number} count */
export function signageCardValuePx(count = 1) {
  if (count <= 2) return 38;
  if (count <= 4) return 32;
  if (count <= 6) return 28;
  if (count <= 8) return 24;
  return 20;
}

/** @param {number} itemCount */
export function signageMealItemPx(itemCount = 1) {
  if (itemCount <= 3) return 24;
  if (itemCount <= 5) return 20;
  if (itemCount <= 7) return 18;
  return 16;
}

/** @param {number} count */
export function signageCardLabelPx(count = 1) {
  if (count <= 4) return 22;
  if (count <= 8) return 20;
  return 18;
}
