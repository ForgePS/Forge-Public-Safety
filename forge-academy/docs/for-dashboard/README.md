# Dashboard repo bootstrap

These files are **templates for [ForgePS/Dashboard](https://github.com/ForgePS/Dashboard)**. Copy them into that repository when setting up or onboarding developers.

## Copy into Dashboard repo

From the Forge Academy repo:

```text
forge-academy/docs/for-dashboard/ARCHITECTURE.md  →  docs/ARCHITECTURE.md
forge-academy/docs/for-dashboard/INTEGRATION.md  →  docs/INTEGRATION.md
```

```powershell
# Run from a machine with both repos cloned
Copy-Item forge-academy\docs\for-dashboard\ARCHITECTURE.md ..\Dashboard\docs\ARCHITECTURE.md
Copy-Item forge-academy\docs\for-dashboard\INTEGRATION.md ..\Dashboard\docs\INTEGRATION.md
```

## Suggested Dashboard repo layout

```text
Dashboard/
├── docs/
│   ├── ARCHITECTURE.md
│   └── INTEGRATION.md
├── src/                 # Admin + player SPA
├── functions/           # display-payload API, RMS sync jobs
├── firebase.json
└── README.md
```

## First milestones

1. Player route `/display/:displayId/:publicKey` (1080p signage viewport)
2. Admin: register displays, assign layouts
3. Mock RMS widget data → replace with `GET /v1/departments/{id}/dashboard-feed`
4. Deploy to its own Firebase project (not `forge-academy-95f84`)

## Stay in sync

When integration contracts change, update:

- `forge-academy/docs/INTEGRATION.md` (Academy perspective)
- `forge-academy/docs/for-dashboard/INTEGRATION.md` (Dashboard perspective)
- Copy refreshed files to the Dashboard repo
