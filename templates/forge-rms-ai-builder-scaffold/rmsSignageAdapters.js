/**
 * RMS ops signage — register ForgeBuilderPanel on layout editor.
 * Copy into RMS displays admin when porting forge-dashboard-scaffold.
 */
import { RMS_WIDGET_TYPES } from "@forgeps/ai-builder/rms";

export const RMS_SIGNAGE_ADAPTERS = ["signageLayout", "signagePlaylist", "signageDisplay"];

/** @param {string} widgetType */
export function isRmsWidgetType(widgetType) {
  return RMS_WIDGET_TYPES.includes(widgetType);
}

/**
 * @param {Record<string, unknown>} output
 * @param {(patch: Record<string, unknown>) => void} patchForm
 */
export function applyRmsSignageLayout(output, patchForm) {
  patchForm({
    name: output.name,
    templateId: output.templateId ?? "custom",
    zones: output.zones ?? [],
    product: "rms",
  });
}
