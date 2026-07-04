# Dual-product AI Builder deployment

Forge AI Builder ships in **two Firebase projects** with one shared npm package.

## Shared package

```text
packages/forge-ai-builder/
```

Consumed by:

- **Forge Academy** — `forge-academy/` (this repo)
- **Forge RMS** — separate repo; see `templates/forge-rms-ai-builder-scaffold/`

## Academy (this repo)

| Component | Path |
|-----------|------|
| Cloud Functions | `forge-academy/functions/lib/aiBuilder*.js` |
| Callable exports | `forgeAiBuildCallable`, `logAiBuilderApplyCallable` |
| UI panel | `forge-academy/src/components/aiBuilder/` |
| CI deploy | `.github/workflows/deploy-forge-academy.yml` |
| GitHub secret | **`FIREBASE_TOKEN`** (from `firebase login:ci`) — no JSON key required |

Deploy triggers on push to `main` when `forge-academy/**` changes.

### CI deploy without a service account key

Many orgs block **Generate new private key** in Google Cloud. Use a CI token instead:

```bash
cd forge-academy
npx firebase-tools login:ci
```

1. Complete the browser sign-in (same Google account that can deploy to `forge-academy-95f84`)
2. Copy the long token printed in the terminal
3. GitHub → **Settings** → **Secrets and variables** → **Actions** → **`FIREBASE_TOKEN`** → paste the token
4. Re-run **Deploy Forge Academy**

No service account JSON. No `google-github-actions/auth` when using `FIREBASE_TOKEN`.

**Local deploy** (no GitHub secret): `firebase login` once, then `npm run deploy`. When asked to delete orphan cloud functions, answer **N**.

Optional: if your org *does* allow JSON keys, `FIREBASE_SERVICE_ACCOUNT` still works as a fallback.

## RMS (separate repo)

| Component | Source |
|-----------|--------|
| Cloud Functions | Copy from Academy `functions/lib/aiBuilder*.js` |
| Ops signage | `templates/forge-dashboard-scaffold/` + RMS adapters |
| CI template | `.github/workflows/deploy-forge-rms.yml` |
| Secret | `FIREBASE_SERVICE_ACCOUNT_RMS` |

## No cross-project Firestore

Each product's apply handlers write only to that product's Firestore. Shared code is limited to:

- Adapter registry and JSON schemas (`@forgeps/ai-builder`)
- Cloud Function handler pattern (copied per project)

Optional cross-product widgets (e.g. Academy classes on RMS TVs) use HTTP APIs documented in `forge-academy/docs/INTEGRATION.md`.

## Feature flag

Both products respect `systemSettings/default.features.aiBuilderEnabled` (default: enabled for admins).