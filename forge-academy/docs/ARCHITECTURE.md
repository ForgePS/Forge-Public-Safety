# Forge Public Safety — Product Architecture

Forge Public Safety is a family of separate products. Each product has its own repository, Firebase project, and deployment. Products connect through **APIs and shared identifiers**, not shared databases or merged codebases.

## Ecosystem map

```text
Forge Public Safety (company)
│
├── Public website          (separate program — not in this repo)
│     Marketing, login links only
│
├── Forge Academy           (this repo — forge-academy/)
│     Training: registration, classes, skills, testing, certs, transcripts
│     └── Campus Signage    Admin → Digital Dashboard, player at /display/...
│
├── Forge RMS               (separate repo)
│     Operations: personnel, incidents, units, departments
│     └── Forge Field App
│
└── ForgePS Dashboard       https://github.com/ForgePS/Dashboard
      Org / ops digital signage (Display 1, Display 2, …)
      Primary data feed: RMS APIs (future)
```

## Forge Academy (this application)

| Item | Value |
|------|--------|
| **Purpose** | Statewide fire training academy operations (AFTA pilot) |
| **Firebase project** | `forge-academy-95f84` |
| **Hosted app** | https://forge-academy-95f84.web.app |
| **Portals** | Admin, student, department, instructor, certification |

### Campus Signage (built into Academy)

Academy includes **campus digital signage** for training-site TVs:

- **Admin:** `/admin/digital-dashboard`
- **Player:** `/display/:displayId/:publicKey`
- **Typical content:** class schedules, dining menus, Google Sheet rosters, campus announcements, media slides
- **Data source:** Academy Firestore (`digitalDashboard*` collections)

This is **not** the same product as [ForgePS/Dashboard](https://github.com/ForgePS/Dashboard). Academy signage is campus-specific. The Dashboard repo is org-wide signage fed primarily from RMS.

## Design principles

1. **Separate backends** — Academy and RMS each own their Firestore / auth. No cross-project database reads.
2. **APIs for integration** — Server-to-server HTTP or webhooks when products need each other's data.
3. **Stable shared IDs** — `departmentId`, FDID, `studentId`, and future `forgePersonId` so systems can link records without merging schemas.
4. **Website is external** — Public site links to Academy and RMS login URLs only; it does not share data stores with either product.
5. **Shared UI later, not shared data now** — If display players converge, extract a small shared player package; keep data layers separate.

## What lives where

| Capability | Owner |
|------------|--------|
| Class scheduling, registration, attendance | Academy |
| Skills, testing, certificates, certifications | Academy |
| Campus TV signage (dining, class sheets) | Academy |
| Incidents, units, field operations | RMS |
| Department / personnel system of record (future) | RMS (likely hub for org data) |
| Org-wide ops TV signage | ForgePS/Dashboard |
| Public marketing website | Off-site program |

## Repository note

The Git remote `ForgePS/Forge-Academy` may still contain legacy marketing-site files at the repository root. The **Forge Academy product** is the `forge-academy/` directory. Marketing site maintenance belongs to the off-site website program.

See [INTEGRATION.md](./INTEGRATION.md) for planned cross-product APIs and identifiers.
