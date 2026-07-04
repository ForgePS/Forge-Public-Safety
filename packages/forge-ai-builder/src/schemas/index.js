export const VALID_WIDGET_TYPES = new Set([
  "weather", "clock", "announcements", "emergency", "student_stats",
  "instructor_dashboard", "testing_status", "certification_status", "housing_status",
  "lms_progress", "dining", "certification_metrics", "active911", "cad_dashboard",
  "qr_code", "video", "pdf", "office", "html",
  "alerts", "units", "incidents", "kpi", "media", "training_classes",
]);

export const VALID_TEMPLATE_IDS = new Set([
  "lobby", "classroom", "testing_center", "executive", "housing", "dining_hall", "custom",
]);

const GRID_COLS = 12;
const GRID_ROWS = 8;

/**
 * @param {unknown} zone
 */
export function validateLayoutZone(zone) {
  const errors = [];
  if (!zone || typeof zone !== "object") {
    return { valid: false, errors: ["Zone must be an object."] };
  }
  const z = /** @type {Record<string, unknown>} */ (zone);
  const widgetType = String(z.widgetType ?? "").trim();
  if (!VALID_WIDGET_TYPES.has(widgetType)) errors.push(`Invalid widgetType: ${widgetType}`);
  const x = Number(z.x ?? 0);
  const y = Number(z.y ?? 0);
  const w = Number(z.w ?? 1);
  const h = Number(z.h ?? 1);
  if (x < 0 || x >= GRID_COLS) errors.push("Zone x out of range.");
  if (y < 0 || y >= GRID_ROWS) errors.push("Zone y out of range.");
  if (w < 1 || x + w > GRID_COLS) errors.push("Zone width invalid.");
  if (h < 1 || y + h > GRID_ROWS) errors.push("Zone height invalid.");
  if (errors.length) return { valid: false, errors };
  return {
    valid: true,
    errors: [],
    zone: {
      id: String(z.id ?? `zone-${Math.random().toString(36).slice(2, 8)}`),
      widgetType,
      x: Math.floor(x),
      y: Math.floor(y),
      w: Math.floor(w),
      h: Math.floor(h),
    },
  };
}

/**
 * @param {unknown} output
 */
export function validateSignageLayoutOutput(output) {
  const errors = [];
  if (!output || typeof output !== "object") return { valid: false, errors: ["Output must be an object."] };
  const o = /** @type {Record<string, unknown>} */ (output);
  const name = String(o.name ?? "").trim();
  const templateId = String(o.templateId ?? "custom").trim();
  if (!name) errors.push("Layout name is required.");
  if (templateId && !VALID_TEMPLATE_IDS.has(templateId)) errors.push(`Invalid templateId: ${templateId}`);
  if (!Array.isArray(o.zones) || !o.zones.length) errors.push("At least one zone is required.");

  /** @type {Record<string, unknown>[]} */
  const zones = [];
  if (Array.isArray(o.zones)) {
    for (let i = 0; i < o.zones.length; i += 1) {
      const result = validateLayoutZone(o.zones[i]);
      if (!result.valid) errors.push(`Zone ${i + 1}: ${result.errors.join(" ")}`);
      else if (result.zone) zones.push(result.zone);
    }
  }
  if (errors.length) return { valid: false, errors };
  return {
    valid: true,
    errors: [],
    data: { name, templateId: VALID_TEMPLATE_IDS.has(templateId) ? templateId : "custom", zones },
  };
}
