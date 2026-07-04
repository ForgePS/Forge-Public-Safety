# Forge RMS — AI Builder integration scaffold

Bootstrap for wiring **Forge AI Builder** into the Forge RMS repo (separate Firebase project).

## What to copy into RMS

1. **Shared package** — vendor or symlink `@forgeps/ai-builder` from this monorepo:

   ```text
   packages/forge-ai-builder/  →  ../packages/forge-ai-builder  (git submodule or copy)
   ```

2. **Cloud Functions** — copy from Academy and adjust project id:

   ```text
   forge-academy/functions/lib/aiBuilder*.js  →  functions/lib/
   forge-academy/functions/index.js           →  export forgeAiBuildCallable, logAiBuilderApplyCallable
   ```

3. **Frontend panel** — copy or extract:

   ```text
   forge-academy/src/components/aiBuilder/ForgeBuilderPanel.jsx
   forge-academy/src/components/aiBuilder/ModuleFormRenderer.jsx
   forge-academy/src/lib/aiBuilder/
   ```

4. **Ops signage** — start from dashboard scaffold:

   ```text
   forge-academy/templates/forge-dashboard-scaffold/
   ```

   Register adapters: `signageLayout`, `signagePlaylist`, `signageDisplay` with **RMS widget catalog** (`RMS_WIDGET_TYPES` from `@forgeps/ai-builder/rms`).

## Adapter target types (RMS)

| targetType | Admin surface |
|------------|---------------|
| `moduleCheckoff` | Fleet / apparatus checklists |
| `moduleInventory` | Supply inventory |
| `moduleInspection` | Inspection forms |
| `moduleCustom` | Generic forms |
| `signageLayout` | Displays admin — layout designer |
| `signagePlaylist` | Displays admin — playlists |
| `signageDisplay` | Display registration |

## Environment

Set in RMS Firebase Functions (separate from Academy):

- `OPENAI_API_KEY` — optional; fallback templates used when unset
- Firestore collections: `moduleDefinitions`, `moduleSubmissions`, `displayLayouts`, `displays`, `aiBuilderAuditLogs`

## Architecture rules

- **No cross-project Firestore** — RMS widgets read RMS data only
- Optional Academy training widgets via read-only API (see `forge-academy/docs/INTEGRATION.md`)
- Same preview → approve flow as Academy; never generate React player code

## Deploy

Use `.github/workflows/deploy-forge-rms.yml` in this repo as a template. RMS requires its own `FIREBASE_SERVICE_ACCOUNT_RMS` GitHub secret.
