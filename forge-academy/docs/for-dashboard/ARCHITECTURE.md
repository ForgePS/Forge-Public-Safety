# ForgePS Dashboard — Architecture

ForgePS Dashboard is org-wide **digital signage** for fire departments and operations centers. It is a **separate product** from Forge Academy campus signage and from Forge RMS.

## Position in Forge Public Safety

```text
Forge Public Safety
├── Forge RMS              → system of record for ops / personnel (primary data feed)
├── ForgePS Dashboard      → THIS REPO — TV displays (Display 1, Display 2, …)
├── Forge Academy          → training platform + campus signage (separate product)
└── Public website         → off-site marketing (links only)
```

## Responsibilities

| Owns | Does not own |
|------|----------------|
| Org / station TV layouts & playlists | Class registration, transcripts, certs |
| RMS-fed widgets (units, incidents, alerts) | Academy Firestore data (read via API only) |
| Display player URLs & device registry | RMS business logic (consume RMS APIs) |
| Dashboard admin for ops displays | Campus dining / AFTA class schedules (Academy product) |

## Technical boundaries

- **Own Firebase project** — do not share Firestore with Academy or RMS.
- **Read RMS via HTTPS APIs** — primary content source.
- **Optional Academy widgets** — only through future read-only Academy APIs (e.g. today's classes), not direct Firestore access.
- **Player pattern** — public display URL + secret key (same concept as Academy `/display/:id/:key`).

## Related repositories

| Product | Repository | Signage |
|---------|------------|---------|
| ForgePS Dashboard | `ForgePS/Dashboard` | Org displays (this repo) |
| Forge Academy | `ForgePS/Forge-Academy` | Campus displays (`/admin/digital-dashboard`) |
| Forge RMS | *(separate)* | Data hub |

Copy `INTEGRATION.md` from this folder into the Dashboard repo root `docs/` alongside this file.

See Forge Academy `docs/INTEGRATION.md` for shared IDs and cross-product API plans.
