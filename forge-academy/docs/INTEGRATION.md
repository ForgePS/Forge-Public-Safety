# Integration boundaries

This document describes how Forge Academy connects to other Forge Public Safety products **today** and **planned**.

See [API_CONTRACTS.md](./API_CONTRACTS.md) for draft request/response shapes.

Dashboard repo templates (copy to `ForgePS/Dashboard`): [for-dashboard/README.md](./for-dashboard/README.md)

## Connected products

| Product | Repository | Role |
|---------|------------|------|
| Forge Academy | `ForgePS/Forge-Academy` (`forge-academy/`) | Training system of record |
| Forge RMS | Separate repo | Operations / personnel (future hub for org data) |
| ForgePS Dashboard | https://github.com/ForgePS/Dashboard | RMS-fed digital signage |
| Public website | Off-site | Marketing and login links only |

## Rules

- **Do not** read another product's Firestore from Academy functions or client code.
- **Do not** embed RMS or Dashboard admin UIs inside Academy.
- **Do** use authenticated HTTPS APIs or webhooks when sharing data.
- **Do** store foreign keys on Academy records when linked (e.g. `rmsPersonId` on a student when sync exists).

## Shared identifiers (use consistently)

| ID | Description | Academy usage |
|----|-------------|---------------|
| `departmentId` | Academy department document id | Students, registrations, department portal |
| `fdid` | Fire department FDID | Department profile |
| `studentId` | Academy `students` collection id | Registrations, transcripts |
| `userId` | Firebase Auth uid | Portal login |
| `rmsPersonId` | *(planned)* RMS personnel id | Link student ↔ RMS member |
| `rmsDepartmentId` | *(planned)* RMS org id | Link department ↔ RMS agency |

## Academy-owned APIs (today)

Academy exposes Firebase Callable Functions and public player endpoints for its own features. Examples:

| Endpoint / callable | Purpose |
|---------------------|---------|
| `getDigitalDisplayPayloadCallable` | Campus signage player payload |
| `fetchPublishedGoogleSheetCallable` | Published sheet CSV fallback |
| LMS webhook (`x-lms-secret`) | External LMS completion → Academy records |

## Planned: RMS → Academy

| Direction | Use case | Suggested shape |
|-----------|----------|-----------------|
| RMS → Academy | Sync department roster | `GET /v1/departments/{id}/members` |
| RMS → Academy | Verify employment / department assignment | `GET /v1/people/{rmsPersonId}` |
| Academy → RMS | Training completion for personnel file | `POST /v1/webhooks/training-completed` |

*Not implemented yet. Define OpenAPI contracts in each repo when RMS API is ready.*

## Planned: RMS → ForgePS Dashboard

ForgePS/Dashboard is the **primary consumer** of RMS operational data for org-wide displays (units, incidents, alerts, department KPIs). Academy is not in that path unless a specific widget needs training data.

## Planned: Academy → ForgePS Dashboard (optional)

Optional widgets on department TVs, e.g. "Today's classes at AFTA":

| Widget | Academy source |
|--------|----------------|
| Class schedule slide | Open class sessions API (read-only) |
| Campus announcements | Portal announcements (instructor/student audiences) |

Implement as a **read-only Academy API** with API keys scoped per display or department.

## Academy Campus Signage vs ForgePS Dashboard

| | Academy Campus Signage | ForgePS Dashboard |
|--|------------------------|-------------------|
| **Repo** | `forge-academy` | `ForgePS/Dashboard` |
| **Admin** | `/admin/digital-dashboard` | Dashboard repo admin |
| **Player** | `/display/:id/:key` | Dashboard repo player |
| **Data** | Academy Firestore | RMS APIs (primary) |
| **Audience** | AFTA campus TVs | Stations, ops centers, Display 1/2 |

Keep both. Extract a shared signage **player** library only if the UI engine diverges painfully.

## Webhook pattern (reference)

Academy already accepts LMS webhooks with a shared secret header. Use the same pattern for RMS → Academy events:

```http
POST /webhooks/training-completed
X-Integration-Secret: <rotating secret>
Content-Type: application/json

{ "studentId": "...", "courseId": "...", "completedDate": "2026-06-19" }
```

Store secrets in Firebase environment config / GitHub Actions secrets — never in git.

## Checklist before first cross-product integration

- [ ] Agree on `departmentId` / FDID mapping between RMS and Academy
- [ ] Service account or API key per integration direction
- [ ] Rate limits and idempotency on webhook handlers
- [ ] Audit log for sync jobs (who changed what, when)
- [ ] Document which system is **system of record** for each entity type
