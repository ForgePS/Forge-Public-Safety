# Integration boundaries

How Forge Academy connects to Forge RMS and other Forge Public Safety products.

Canonical HTTP contracts: [API_CONTRACTS.md](./API_CONTRACTS.md) (v0.4).  
Hub service: [`integration-hub/`](../integration-hub/).

Dashboard templates: [for-dashboard/README.md](./for-dashboard/README.md)

## Connected products

| Product | Repository / path | Role |
|---------|-------------------|------|
| Forge Academy | this repo | Training system of record |
| Forge Integration Hub | `integration-hub/` | Person Identity SoR + central sync, retries, audit |
| Forge RMS | [ForgePS/firebase-app](https://github.com/ForgePS/firebase-app) | Operations / personnel system of record |
| ForgePS Dashboard | https://github.com/ForgePS/Dashboard | RMS-fed digital signage |
| Public website | Off-site | Marketing and login links only |

## Live deployments

| Product | Project ID | Hosting / URL |
|---------|------------|---------------|
| Forge Academy | `forge-academy-95f84` | https://forge-academy-95f84.web.app |
| Forge RMS | `rms-dashboard-7562e` | https://rms-dashboard-7562e.web.app |
| Integration Hub | Cloud Run (configure) | `/api/integrations/v1` |

## Rules

- **Do not** read another product's Firestore from Academy or RMS client/functions.
- **Do** send all cross-product sync through the Integration Hub when `hubBaseUrl` is configured.
- **Do** resolve people through Hub `POST /identity/resolve` before Academy or RMS creates a person record.
- **Do not** use Firebase Auth UID as `personId` / `forgePersonId`.
- **Do not** let Academy or RMS mint independent personIds without Hub.
- **Do** keep systems of record: RMS for employment/roster; Academy for classes, attendance, certificates, invoices; Hub for the person identity map.
- **Do** store forge* foreign keys on linked Academy records (`forgePersonId`, `forgeDepartmentId`, `forgeAcademyStudentId`).

## Forge Person Identity

Hub collection `hubIdentities/{personId}` is the permanent Forge-wide person record.

1. Normalize FEMA SID (digits only, 9–12).
2. If a unique **verified** FEMA SID match exists → return that `personId`.
3. If no match → create a new Firestore auto-id document; `personId` = `forgePersonId` = doc id.
4. Ambiguous / unverified collisions → `hubDuplicateReviews` (no new personId until resolved).
5. FEMA SID changes go through `hubFemaSidCorrections` (request → approve/reject).
6. Merges write `hubIdentityMerges` + merge history and emit `person.merged` so Academy retargets local FKs.

Legacy `fp_*` identities remain valid; only new creates use Firestore auto-ids.

## Shared identifiers

| ID | Description |
|----|-------------|
| `personId` / `forgePersonId` | Permanent Forge-wide person identity (Hub; never Auth UID; never client-editable) |
| `forgeDepartmentId` | Forge-wide department / connection id (Hub) |
| `forgeAcademyStudentId` | Academy student document id |
| `rmsPersonId` | Legacy RMS personnel id |
| `rmsDepartmentId` | Legacy RMS agency id |
| `studentId` | Academy students collection id |
| `fdid` | Fire department FDID fallback |

## Academy integration surface (today)

| Endpoint / callable | Purpose |
|---------------------|---------|
| `resolveForgePersonIdentityCallable` | Proxy Hub identity resolve (student create) |
| `resolveHubDuplicateReviewCallable` | Resolve Hub duplicate reviews |
| `verifyHubPersonIdentityCallable` | Verify identity / FEMA SID |
| `requestHubFemaSidCorrectionCallable` / approve / reject | FEMA SID correction workflow |
| `rmsPersonnelWebhook` | Compat roster ingest → forwards to Hub when enabled |
| `hubAcademyCommand` | Hub → Academy `upsert_student` / `retarget_person` |
| `pullRosterFromRmsCallable` | Admin roster pull |
| `getHubSyncStatusCallable` | Hub sync dashboard proxy |
| `requestHubResyncCallable` | Manual Hub resync |
| LMS webhook (`X-LMS-Secret`) | External LMS completion |

Admin UI: `/admin/testing/rms-integration` (includes Person Identity review actions)

## System-of-record reminders

| Data | Owner |
|------|--------|
| Permanent personId / FEMA SID verification / merges | Integration Hub (Person Identity) |
| Department roster / employment | Forge RMS |
| Academy student profile, classes, attendance, invoices, certificates | Forge Academy |
| Sync logs + retries | Integration Hub |
| Department training record from completions | Forge RMS (populated via Hub) |

## RMS → ForgePS Dashboard

ForgePS/Dashboard remains the primary consumer of RMS operational data for org-wide displays. Academy Campus Signage stays Academy-owned (`/admin/digital-dashboard`).

## Nightly reconcile

Hub `POST /api/integrations/v1/reconcile/run` (or `npm run reconcile` in `integration-hub/`) produces a **report-only** snapshot of identity gaps and open failures. No auto-overwrite in Phase 1.

Schedule with Cloud Scheduler — see [`integration-hub/scheduler.yaml`](../integration-hub/scheduler.yaml).
