/** @typedef {'academy' | 'rms' | 'both'} AiBuilderProduct */

/**
 * @typedef {Object} AiBuilderAdapterDef
 * @property {string} targetType
 * @property {AiBuilderProduct} product
 * @property {string} label
 * @property {string} description
 * @property {('image' | 'pdf' | 'spreadsheet' | 'text')[]} inputKinds
 * @property {boolean} requiresUpload
 */

/** @type {AiBuilderAdapterDef[]} */
export const AI_BUILDER_ADAPTERS = [
  { targetType: "questionBank", product: "academy", label: "Question bank", description: "Generate test questions from documents", inputKinds: ["pdf", "spreadsheet", "text"], requiresUpload: false },
  { targetType: "testBlueprint", product: "academy", label: "Test blueprint", description: "Exam structure and pool rules", inputKinds: ["pdf", "text"], requiresUpload: false },
  { targetType: "gradingAssist", product: "academy", label: "Grading assist", description: "Suggested score and grader notes", inputKinds: ["text"], requiresUpload: false },
  { targetType: "gradingRubric", product: "academy", label: "Grading rubric", description: "Scoring criteria for short answers", inputKinds: ["pdf", "text"], requiresUpload: false },
  { targetType: "skillTemplate", product: "academy", label: "Skills template", description: "Skills sheet line items", inputKinds: ["pdf", "text"], requiresUpload: false },
  { targetType: "certificateTemplate", product: "academy", label: "Certificate template", description: "Layout and merge fields", inputKinds: ["image", "pdf"], requiresUpload: false },
  { targetType: "signageLayout", product: "both", label: "Signage layout", description: "Grid zones and widgets from mockup", inputKinds: ["image", "pdf", "text"], requiresUpload: false },
  { targetType: "signagePlaylist", product: "both", label: "Signage playlist", description: "Slide order and durations", inputKinds: ["text", "spreadsheet"], requiresUpload: false },
  { targetType: "signageMedia", product: "both", label: "Signage media", description: "Media titles and metadata", inputKinds: ["image", "pdf", "text"], requiresUpload: false },
  { targetType: "signageDisplay", product: "rms", label: "Ops display", description: "Display registration and assignment", inputKinds: ["text"], requiresUpload: false },
  { targetType: "moduleCheckoff", product: "rms", label: "Equipment checkoff", description: "Apparatus/equipment checklist module", inputKinds: ["image", "pdf"], requiresUpload: false },
  { targetType: "moduleInventory", product: "rms", label: "Inventory module", description: "Supply SKUs and par levels", inputKinds: ["spreadsheet", "text"], requiresUpload: false },
  { targetType: "moduleInspection", product: "rms", label: "Inspection module", description: "Inspection forms with photos", inputKinds: ["pdf", "text"], requiresUpload: false },
  { targetType: "moduleCustom", product: "rms", label: "Custom form module", description: "Generic structured data collection", inputKinds: ["text", "pdf"], requiresUpload: false },
];

/** @type {Record<string, AiBuilderAdapterDef>} */
export const AI_BUILDER_ADAPTER_MAP = Object.fromEntries(
  AI_BUILDER_ADAPTERS.map((adapter) => [adapter.targetType, adapter]),
);

/** @param {string} targetType */
export function getAdapterDef(targetType) {
  return AI_BUILDER_ADAPTER_MAP[targetType] ?? null;
}

/** @param {AiBuilderProduct | 'both'} product */
export function listAdaptersForProduct(product) {
  return AI_BUILDER_ADAPTERS.filter((a) => a.product === product || a.product === "both");
}

export const AI_BUILDER_TARGET_TYPES = AI_BUILDER_ADAPTERS.map((a) => a.targetType);
