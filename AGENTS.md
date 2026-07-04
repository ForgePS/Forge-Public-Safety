# AGENTS.md

## Cursor Cloud specific instructions

This repo hosts two independent Vite + React apps (Node 22 works; CI uses Node 20). Dependencies for both are installed by the startup update script (`npm install` at the root and in `forge-academy/`).

### Services

| App | Location | Dev command | Notes |
|-----|----------|-------------|-------|
| Forge Public Safety marketing site | repo root | `npm run dev` (Vite) | Fully static React app, no backend/secrets needed. This is what CI (`.github/workflows/deploy.yml`) builds and deploys. |
| Forge Academy LMS (primary app) | `forge-academy/` | `npm run dev` (Vite) | Firebase-backed. Requires `VITE_FIREBASE_*` env vars to boot (see below). |

Run the two dev servers on different ports if running simultaneously, e.g. `npm run dev -- --port 5173` (marketing) and `npm run dev -- --port 5174` (academy).

### Forge Academy env vars (non-obvious)

`forge-academy/src/lib/firebase.js` calls `assertConfig()` at module load and **throws** (blank screen) if `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, or `VITE_FIREBASE_APP_ID` are missing. So `forge-academy` needs a `.env` (gitignored) to render at all. Create `forge-academy/.env` with these six keys (values from Firebase console → Project settings → Web app):

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Note: the repo `.gitignore` ignores `.env.*`, so `.env.example` cannot be committed here — hence these keys are documented inline. The README's `copy .env.example .env` step refers to a file that is not tracked.

- Placeholder values are enough for the **login page and other UI to render**, but any real auth / Firestore / storage action needs credentials for a real Firebase project (`forge-academy-95f84`). Provide those via secrets to test end-to-end login and data flows.
- `vite build` does **not** run `assertConfig()` (it only bundles), so the production build succeeds without env vars; the check only fires in the browser at runtime.

### Lint / test / build

- No lint config, test suite, or `test`/`lint` npm scripts exist in either app (verified in `package.json`). There is nothing to run for those; do not fabricate commands.
- Build: `npm run build` in each app (root uses Vite 7, `forge-academy/` uses Vite 8). The `forge-academy` build prints a benign large-chunk warning.

### functions/

Root `functions/` (Node 20) is only used for `firebase deploy`; its deps are not required for local dev and are not installed by the update script.
