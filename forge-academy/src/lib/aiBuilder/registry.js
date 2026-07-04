export {
  AI_BUILDER_ADAPTERS,
  AI_BUILDER_ADAPTER_MAP,
  AI_BUILDER_TARGET_TYPES,
  getAdapterDef,
  listAdaptersForProduct,
} from "@forgeps/ai-builder/registry.js";

import { AI_BUILDER_ADAPTER_MAP } from "@forgeps/ai-builder/registry.js";

export const AI_BUILDER_TARGET_LABELS = Object.fromEntries(
  Object.values(AI_BUILDER_ADAPTER_MAP).map((a) => [a.targetType, a.label]),
);
