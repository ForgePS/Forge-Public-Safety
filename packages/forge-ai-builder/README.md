# @forgeps/ai-builder

Shared Forge AI Builder package for **Forge Academy** and **Forge RMS**.

## Exports

- `./registry` — adapter definitions (`signageLayout`, `questionBank`, `moduleCheckoff`, …)
- `./schemas` — shared signage layout JSON validation (12×8 grid)
- `./rms` — RMS module definition helpers and widget catalogs

## Usage (Academy or RMS frontend)

```js
import { AI_BUILDER_ADAPTERS, getAdapterDef } from "@forgeps/ai-builder/registry";
import { validateSignageLayoutOutput } from "@forgeps/ai-builder/schemas";
import { defaultModuleDefinition, RMS_WIDGET_TYPES } from "@forgeps/ai-builder/rms";
```

## Per-product deployment

Each product ships its own Firebase project and `forgeAiBuildCallable` Cloud Function. Both import this package for adapter metadata and schema validation. **No cross-project Firestore reads** — apply handlers write only to that product's database.

See `templates/forge-rms-ai-builder-scaffold/` in the Forge Academy repo for RMS integration bootstrap.
