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
| Secret | `FIREBASE_SERVICE_ACCOUNT` |

Deploy triggers on push to `main` when `forge-academy/**` changes.

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

## GitHub Actions secret setup (Academy)

The **Deploy Forge Academy** workflow requires `FIREBASE_SERVICE_ACCOUNT`. If this secret is missing or empty, `google-github-actions/auth` fails with:

> must specify exactly one of "workload_identity_provider" or "credentials_json"

### Steps

1. Open [Firebase Console](https://console.firebase.google.com/) → project **forge-academy-95f84**
2. **Project settings** → **Service accounts** → **Generate new private key** (JSON)
3. In GitHub: **Forge-Public-Safety** repo → **Settings** → **Secrets and variables** → **Actions**
4. Create or update secret **`FIREBASE_SERVICE_ACCOUNT`** — paste the **entire** JSON file contents
5. Re-run **Deploy Forge Academy** under **Actions** → **workflow_dispatch**, or merge to `main`

The service account needs **Firebase Admin** / deploy permissions for hosting, Firestore rules, and Cloud Functions on `forge-academy-95f84`.

> **Note:** The marketing site workflow (`.github/workflows/deploy.yml`) uses the same secret name for project `rms-dashboard-7562e`. If you deploy both products from one repo, use one service account with access to both projects, or split secrets (e.g. `FIREBASE_SERVICE_ACCOUNT_ACADEMY`) and update the workflow accordingly.
