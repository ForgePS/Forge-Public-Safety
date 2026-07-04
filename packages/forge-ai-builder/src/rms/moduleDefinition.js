export const MODULE_KINDS = ["checkoff", "inventory", "inspection", "custom"];

export const MODULE_FIELD_TYPES = [
  "text", "textarea", "number", "boolean", "select", "pass_fail", "date", "time", "photo", "signature", "barcode",
];

/**
 * @param {Record<string, unknown>} [overrides]
 */
export function defaultModuleDefinition(overrides = {}) {
  return {
    id: "",
    product: "rms",
    kind: "checkoff",
    name: "",
    description: "",
    status: "draft",
    scope: { roles: ["admin"], departmentIds: [], stationIds: [], apparatusIds: [] },
    subject: { type: "apparatus", label: "Apparatus", allowMultiple: false },
    sections: [],
    rules: {},
    views: { listColumns: [], defaultSort: "", filters: [] },
    ...overrides,
  };
}

function validateField(field, index, errors) {
  if (!field || typeof field !== "object") {
    errors.push(`Field ${index + 1}: must be an object.`);
    return null;
  }
  const key = String(field.key ?? "").trim();
  const label = String(field.label ?? "").trim();
  const type = String(field.type ?? "text");
  if (!key) errors.push(`Field ${index + 1}: key is required.`);
  if (!label) errors.push(`Field ${index + 1}: label is required.`);
  if (!MODULE_FIELD_TYPES.includes(type)) errors.push(`Field ${index + 1}: invalid type ${type}.`);
  return { ...field, key, label, type };
}

/**
 * @param {unknown} output
 */
export function validateModuleDefinition(output) {
  const errors = [];
  if (!output || typeof output !== "object") {
    return { valid: false, errors: ["ModuleDefinition must be an object."] };
  }
  const o = /** @type {Record<string, unknown>} */ (output);
  const name = String(o.name ?? "").trim();
  const kind = String(o.kind ?? "custom");
  if (!name) errors.push("name is required.");
  if (!MODULE_KINDS.includes(kind)) errors.push(`Invalid kind: ${kind}`);

  /** @type {Record<string, unknown>[]} */
  const sections = [];
  if (Array.isArray(o.sections)) {
    for (let si = 0; si < o.sections.length; si += 1) {
      const section = /** @type {Record<string, unknown>} */ (o.sections[si] ?? {});
      const items = [];
      if (Array.isArray(section.items)) {
        for (let fi = 0; fi < section.items.length; fi += 1) {
          const field = validateField(section.items[fi], fi, errors);
          if (field) items.push(field);
        }
      }
      sections.push({
        id: String(section.id ?? `section-${si + 1}`),
        title: String(section.title ?? `Section ${si + 1}`),
        items,
      });
    }
  }
  if (!sections.length || !sections.some((s) => s.items?.length)) {
    errors.push("At least one section with fields is required.");
  }

  if (errors.length) return { valid: false, errors };

  return {
    valid: true,
    errors: [],
    data: {
      ...defaultModuleDefinition(),
      ...o,
      name,
      kind,
      sections,
      status: o.status === "published" ? "published" : "draft",
    },
  };
}
