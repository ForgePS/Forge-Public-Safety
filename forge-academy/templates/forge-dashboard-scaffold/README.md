# ForgePS Dashboard (scaffold)

Minimal starter for [ForgePS/Dashboard](https://github.com/ForgePS/Dashboard) — org-wide RMS-fed digital signage.

This folder is a **template**. Copy its contents into the Dashboard GitHub repository (or use it as the initial commit).

## Includes

- Vite + React + Tailwind
- **1920×1080** player at `/display/:displayId/:publicKey`
- Mock RMS widgets (alerts, units, incidents) with slide rotation
- Minimal admin home with sample player link
- `firebase.json` for hosting deploy

## Quick start

```powershell
cd forge-dashboard-scaffold
npm install
npm run dev
```

- Admin: http://localhost:5173/
- Player: http://localhost:5173/display/display-1/demo-key-change-me

## Deploy

```powershell
copy .firebaserc.example .firebaserc
# Edit .firebaserc with your Firebase project id
npm run build
firebase deploy --only hosting
```

## Documentation

Copy from Forge Academy repo:

```text
forge-academy/docs/for-dashboard/ARCHITECTURE.md  →  docs/ARCHITECTURE.md
forge-academy/docs/for-dashboard/INTEGRATION.md   →  docs/INTEGRATION.md
```

API contract draft: Forge Academy `docs/API_CONTRACTS.md`

## Replace mock data

Edit `src/lib/mockDisplayPayload.js` first, then:

1. Add Firebase Functions callable `getDisplayPayload`
2. Call RMS `GET /v1/departments/{rmsDepartmentId}/dashboard-feed`
3. Cache snapshot in Dashboard Firestore for offline player resilience

## Not included (build next)

- Firestore display registry & admin CRUD
- Layout designer (see Forge Academy Forge Displays for reference)
- Academy training widgets (optional API consumer)

## Related products

| Product | Repo | Signage |
|---------|------|---------|
| ForgePS Dashboard | This repo | Org / RMS displays |
| Forge Academy | ForgePS/Forge-Academy | Campus displays |
| Forge RMS | Separate | Data source |
