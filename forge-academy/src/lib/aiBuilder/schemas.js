export { AI_BUILDER_TARGET_TYPES } from "@forgeps/ai-builder/registry.js";
export {
  VALID_WIDGET_TYPES,
  VALID_TEMPLATE_IDS,
  validateLayoutZone,
  validateSignageLayoutOutput,
} from "@forgeps/ai-builder/schemas";

/** @typedef {import("@forgeps/ai-builder/registry.js").AI_BUILDER_TARGET_TYPES[number]} AiBuilderTargetType */

/**
 * Client-side validation mirrors server validators for preview feedback.
 * @param {string} targetType
 * @param {unknown} output
 */
export function validateAiBuilderOutput(targetType, output) {
  if (targetType === "signageLayout") {
    return validateSignageLayoutOutput(output);
  }
  return { valid: true, errors: [], data: output && typeof output === "object" ? output : {} };
}
