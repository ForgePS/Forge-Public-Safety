# API contracts

Cross-product HTTP contracts for Forge Academy ↔ Forge Integration Hub ↔ Forge RMS.

Version: `0.3`

**Environments**

| Product | Base URL (hosting) | Cloud Functions / Run | Firebase / GCP project |
|---------|-------------------|------------------------|-------------------------|
| Forge Academy | `https://forge-academy-95f84.web.app` | `https://us-central1-forge-academy-95f84.cloudfunctions.net` | `forge-academy-95f84` |
| Forge RMS | `https://rms-dashboard-7562e.web.app` | `https://us-central1-rms-dashboard-7562e.cloudfunctions.net` | `rms-dashboard-7562e` |
| Forge Integration Hub | Cloud Run URL (configure per env) | `/api/integrations/v1` | Hub project (or Academy project Phase 1) |

Hub source: [`integration-hub/`](../integration-hub/) · OpenAPI: [`integration-hub/openapi.yaml`](../integration-hub/openapi.yaml)

**Platform tenant / department connection id:** `forge-platform` (main Forge Public Safety platform — not a single fire department).

---

## Architecture (Phase 1)

```text
Forge RMS ──events/personnel──► Integration Hub ──commands──► Forge Academy
Forge Academy ──certificate.issued──► Integration Hub ──training_completed──► Forge RMS
```

- Do **not** read another product's Firestore.
- Hub owns identity maps, sync logs, retries, and duplicate reviews.
- Academy `rmsPersonnelWebhook` remains a **compat shim** that forwards to the Hub when `hubBaseUrl` is set.

---

## Authentication

| Pattern | When |
|---------|------|
| `Authorization: Bearer <token>` | Preferred Hub ↔ Academy / RMS service calls |
| `X-Integration-Secret: <secret>` | Compat shim (legacy webhooks + Hub) |

Configure Hub secrets via env or Secret Manager (`HUB_USE_SECRET_MANAGER=true`).  
Configure Academy Hub fields in **RMS Integration** settings (`hubBaseUrl`, `hubBearerToken`, `hubSecret`).

---

## Integration Hub API (`/api/integrations/v1`)

### Health

`GET /health` → `{ ok, service, version }`

### Departments

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/departments` | Create/upsert department connection profile |
| GET | `/departments/{forgeDepartmentId}` | Read connection |
| PATCH | `/departments/{forgeDepartmentId}` | Update profile |
| POST | `/departments/{forgeDepartmentId}/connect` | Authorize connection (`status: active`) |
| POST | `/departments/{forgeDepartmentId}/disconnect` | Revoke (`status: revoked`, keep history) |
| GET/POST | `/departments/{forgeDepartmentId}/personnel` | List / upsert personnel batch |

### Person Identity (canonical)

Academy and RMS **must** call resolve before creating a person. Neither product may mint `forgePersonId` / `personId` independently. Firebase Auth UID is never used as `personId`. New identities use a Firestore auto-generated document ID; legacy `fp_*` ids remain valid.

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/identity/resolve` | Normalize FEMA SID, return verified match or create personId |
| GET | `/identity/{personId}` | Read identity (`?follow=1` after merge) |
| POST | `/identity/{personId}/verify` | Mark identity / FEMA SID verified |
| POST | `/identity/{personId}/fema-sid/corrections` | Request controlled FEMA SID correction |
| GET | `/identity/fema-sid/corrections` | List correction cases |
| POST | `/identity/fema-sid/corrections/{id}/approve` | Approve correction (uniqueness enforced) |
| POST | `/identity/fema-sid/corrections/{id}/reject` | Reject correction |
| GET | `/identity/duplicates` | List pending duplicate reviews |
| POST | `/identity/duplicates/{reviewId}/resolve` | `merge` \| `keep_separate` \| `link_existing` |
| POST | `/identity/merge` | Controlled merge with history + audit |

**Resolve contract**

```json
POST /identity/resolve
{
  "femaSid": "123456789",
  "firstName": "Jeremy",
  "lastName": "Powell",
  "email": "jeremy@example.com",
  "dateOfBirth": "1980-01-01",
  "rmsPersonId": "FPS-001",
  "sourceSystem": "rms"
}
```

- Unique **verified** FEMA SID → existing `personId` (HTTP 200)
- No match → create `hubIdentities/{autoId}` with `personId` = `forgePersonId` = doc id (HTTP 200)
- Ambiguous / unverified collision → `hubDuplicateReviews` queued (HTTP 202, no new personId)

### Personnel (aliases)

| Method | Path | Purpose |
|--------|------|---------|
| PATCH | `/personnel/{forgePersonId}` | Patch identity map (`personId` / FEMA SID immutable here) |
| POST | `/personnel/{forgePersonId}/status` | Employment / eligibility status |

### Events & sync

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/events` | Ingest canonical event (`202`) |
| GET | `/events/{eventId}` | Fetch event |
| GET | `/sync/status` | Failures, duplicate reviews, FEMA corrections, connections |
| POST | `/sync/resync` | Retry failed event or force roster resync |
| POST | `/reconcile/run` | Report-only nightly reconcile |

### Canonical event envelope

```json
{
  "eventId": "evt_…",
  "eventType": "person.updated",
  "eventVersion": "1",
  "occurredAt": "2026-07-14T16:00:00.000Z",
  "sourceSystem": "rms",
  "forgeDepartmentId": "fd_…",
  "forgePersonId": "<firestore-auto-id or legacy fp_…>",
  "relatedRecordId": "HL-001",
  "correlationId": "cor_…",
  "retryCount": 0,
  "data": {}
}
```

Event types: `department.connection.authorized`, `department.updated`, `person.created`, `person.updated`, `person.status_changed`, `person.merged`, `course.completed`, `certificate.issued`.

---

## Academy adapters

### `POST /rmsPersonnelWebhook` (compat)

RMS may still push roster updates here. When Hub is configured, Academy forwards to Hub personnel endpoint; Hub calls Academy `hubAcademyCommand`.

**Headers:** `X-Integration-Secret`

### `POST /hubAcademyCommand` (Hub → Academy)

```json
{
  "type": "upsert_student",
  "forgePersonId": "<required personId from Hub>",
  "forgeDepartmentId": "fd_…",
  "correlationId": "cor_…",
  "person": {
    "rmsPersonId": "FPS-001",
    "firstName": "Jeremy",
    "lastName": "Powell",
    "email": "admin@forgepublicsafety.com",
    "active": true
  }
}
```

`forgePersonId` is required for `upsert_student`. Academy never generates personIds.

`retarget_person` retargets Academy student rows after an identity merge (`survivorPersonId`, `loserPersonId`).

### Callables

| Callable | Purpose |
|----------|---------|
| `resolveForgePersonIdentityCallable` | Proxy Hub `POST /identity/resolve` (admin/staff student create) |
| `resolveHubDuplicateReviewCallable` | Proxy Hub duplicate review resolve |
| `requestHubFemaSidCorrectionCallable` | Proxy Hub FEMA SID correction request |
| `approveHubFemaSidCorrectionCallable` | Proxy Hub FEMA SID correction approve |
| `rejectHubFemaSidCorrectionCallable` | Proxy Hub FEMA SID correction reject |
| `verifyHubPersonIdentityCallable` | Proxy Hub identity verify |
| `pullRosterFromRmsCallable` | Pull RMS `listPeople` then ingest via Hub/local |
| `getHubSyncStatusCallable` | Proxy Hub `/sync/status` |
| `requestHubResyncCallable` | Proxy Hub `/sync/resync` |

---

## Legacy point-to-point (fallback)

Used only when Hub is **not** configured:

| Direction | Endpoint |
|-----------|----------|
| Academy pull | RMS `GET /listPeople?tenantId=` |
| Academy → RMS training | RMS `POST /trainingCompletedWebhook` |
| RMS person lookup | RMS `GET /getPerson` (still unused by Academy) |

---

## Shared identifiers

| Field | System | Purpose |
|-------|--------|---------|
| `personId` / `forgePersonId` | Hub + both | Permanent Forge-wide person identity (Firestore auto doc id; never Auth UID; never client-editable) |
| `forgeDepartmentId` | Hub + both | Permanent department / connection identity |
| `forgeAcademyStudentId` | Academy + Hub map | Academy `students/{id}` |
| `rmsPersonId` | Both | Legacy / RMS-native personnel id |
| `rmsDepartmentId` | Both | Legacy agency id |
| `studentId` | Academy | Same as academy student doc id |
| `fdid` | Both | FDID fallback match |

Reserved for later phases: `forgeCourseId`, `forgeClassId`, `forgeEnrollmentId`, `forgeInvoiceId`, `forgePaymentId`, `forgeCertificateId`, `forgeTransactionId`.

---

## Hub Firestore collections

| Collection | Purpose |
|------------|---------|
| `hubIdentities` | Person identity map (`personId` = doc id) |
| `hubConnections` | Department connection records |
| `hubEvents` | Immutable event log |
| `hubSyncState` | Per-entity sync status |
| `hubDuplicateReviews` | Potential merges awaiting review |
| `hubIdentityMerges` | Immutable merge records |
| `hubFemaSidCorrections` | Controlled FEMA SID correction workflow |
| `hubSyncFailures` | Failed / retry-scheduled deliveries |
| `hubAuditLogs` | Append-only audit |
| `hubReconcileReports` | Nightly report-only reconcile output |

---

## RMS UI contract (RMS repo)

Settings → **Forge Academy Connection** should call Hub:

1. `POST /departments` (upsert profile)
2. `POST /departments/{forgeDepartmentId}/connect` (authorize + scopes)
3. `POST /departments/{forgeDepartmentId}/disconnect` (revoke without deleting history)
4. Poll `GET /sync/status` for sync health

**Person create / update (required):**

1. `POST /identity/resolve` with normalized FEMA SID + demographics (and `rmsPersonId` when known)
2. Persist returned `forgePersonId` / `personId` on the RMS person record
3. Never generate a local personId; never use Auth UID as personId
4. Resolve pending duplicates / FEMA corrections via Hub identity APIs (or Academy admin proxies)

---

## Changelog

| Version | Date | Notes |
|---------|------|-------|
| 0.4 | 2026-07-18 | Forge Person Identity — auto-id personId, verified FEMA resolve, merge/FEMA correction APIs |
| 0.3 | 2026-07-14 | Integration Hub Phase 1 — forge* IDs, events, Hub adapters |
| 0.2 | 2026-06-17 | Implemented bidirectional Academy ↔ RMS sync |
| 0.1 | 2026-06-19 | Initial draft |
