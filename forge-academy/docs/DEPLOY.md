# Forge Academy deploy

## Blank page after deploy

If https://forge-academy-95f84.web.app shows a gray screen with no UI, the hosting bundle was built without Firebase web config. The app needs `VITE_FIREBASE_*` at **build time** (Vite inlines them into the JS bundle).

**Fix locally:**

```bash
cd forge-academy
cp .env.example .env   # or set VITE_FIREBASE_* manually
npm run build
npm run deploy:hosting
```

CI sets these in `.github/workflows/deploy-forge-academy.yml`. The app also falls back to committed defaults for `forge-academy-95f84` so a bare `npm run build` works.

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

## Windows build fails (Vite / Rolldown)

If `npm run build` ends with `aggregateBindingErrorsIntoJsError` and `errors: [Getter/Setter]`, scroll **up** in the terminal — the real message is usually a few lines above (e.g. failed to resolve an import).

Try in order:

```powershell
cd forge-academy
Remove-Item -Recurse -Force node_modules, dist -ErrorAction SilentlyContinue
npm ci
node -v    # use Node 22 LTS
npm run build
```

This repo pins **Vite 7** (Rollup) instead of Vite 8 (Rolldown) for reliable Windows builds. After `git pull`, run `npm ci` again so lockfile matches.

Deploy scripts use cross-platform Node helpers (`scripts/deploy-hosting.mjs`) — safe in PowerShell; no bash `$()` syntax.

If the project is on a Windows **Dev Drive**, move it to a normal NTFS path (e.g. `C:\Users\...\Projects`) — Rolldown can panic on Dev Drive volumes.

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
