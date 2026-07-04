# Forge Academy deploy

## What works in GitHub Actions

| Target | `FIREBASE_TOKEN` (login:ci) | Workload Identity |
|--------|----------------------------|-------------------|
| Hosting | Yes | Yes |
| Firestore rules | Yes | Yes |
| Cloud Functions (Gen 2) | **Often fails** | Yes |

`firebase login:ci` tokens authenticate to Firebase but **Cloud Functions upload** also calls Google Cloud APIs (Cloud Build, Artifact Registry). That step frequently fails in CI with a generic "unexpected error" when only `FIREBASE_TOKEN` is set.

## Recommended: deploy functions locally (no JSON key)

```bash
cd forge-academy
npm ci --prefix functions          # install nodemailer, firebase-admin, etc.
npx firebase-tools login          # one-time browser login
npm run deploy:functions          # updates Cloud Functions only
```

Or full deploy:

```bash
npm run deploy
```

### "Timeout after 10000" / "Cannot determine backend specification"

Common on Windows when Firebase analyzes your functions code. The CLI only waits 10 seconds by default.

`npm run deploy:functions` now sets **`FUNCTIONS_DISCOVERY_TIMEOUT=120`** automatically.

Manual override in PowerShell:

```powershell
cd forge-academy
npm ci --prefix functions
$env:FUNCTIONS_DISCOVERY_TIMEOUT = "120"
npm run deploy:functions
```

If it still times out:

- Use **Node 22** (`node -v` should match `functions/package.json` engines)
- Temporarily exclude `functions\node_modules` from Windows Defender
- Or deploy from **WSL** / Git Bash

Quick load test:

```powershell
cd functions
node -e "import('./index.js').then(() => console.log('ok'))"
```

If that prints `ok` in under a few seconds, the longer discovery timeout should fix deploy.

Hosting and rules can still ship from GitHub Actions; run `npm run deploy:functions` locally after merging AI Builder changes.

## GitHub Actions setup

### Hosting + rules (CI)

```bash
npx firebase-tools login:ci
```

Add the token as repo secret **`FIREBASE_TOKEN`**.

### Cloud Functions (CI, no downloadable keys)

Ask a GCP admin to configure **Workload Identity Federation** (no JSON key file for you):

1. GCP → IAM → Workload Identity Federation → pool linked to `ForgePS/Forge-Public-Safety`
2. Grant the linked service account: **Cloud Functions Admin**, **Service Account User**, **Cloud Build Editor**
3. GitHub repo **Variables** (not secrets):
   - `GCP_WORKLOAD_IDENTITY_PROVIDER` — full provider resource name
   - `GCP_SERVICE_ACCOUNT_EMAIL` — e.g. `github-deploy@forge-academy-95f84.iam.gserviceaccount.com`

Re-run **Deploy Forge Academy** — functions deploy uses WIF; hosting uses `FIREBASE_TOKEN`.

## Orphan functions in production

Production may have functions not in this repo (RMS sync, invoicing). Deploy scripts target **only exports in `functions/index.js`** so those are never deleted.
