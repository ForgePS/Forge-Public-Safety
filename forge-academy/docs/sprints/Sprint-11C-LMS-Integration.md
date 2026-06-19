# Sprint 11C — LMS Integration

## Scope

Pilot LMS integration for the Enterprise Testing FRD:

- Admin connector settings (`lmsIntegrationSettings/default`)
- CSV batch import of LMS course completions (`lmsCompletions`)
- Sync `testEligibility.lmsMet` from imported completion records
- Grade passback queue on certificate release (`lmsGradePassbackLog`)

## Routes

| Route | Page |
|-------|------|
| `/admin/testing/lms-integration` | `AdminLmsIntegrationPage.jsx` |

## Libraries

- `src/lib/lmsIntegration.js` — settings, import, eligibility sync, grade passback queue

## Firestore collections

| Collection | Purpose |
|------------|---------|
| `lmsIntegrationSettings` | Single doc `default` — enabled, provider, API URL, passback mode |
| `lmsCompletions` | Imported/synced LMS completion rows per student + course |
| `lmsGradePassbackLog` | Queued or sent grade passback entries keyed by `testResultId` |

## Workflow

1. Admin enables integration and saves provider settings.
2. Admin imports LMS completions CSV (`studentId,courseId,externalCourseId,completedDate,score`).
3. Admin runs **Sync eligibility from LMS** — sets `lmsMet=true` on matching `testEligibility` rows (class course must match).
4. When a certificate is released, a grade passback log entry is queued if integration is enabled.

## Out of scope (future)

- Live LMS API webhook receiver (Cloud Function)
- Automated API grade passback to external gradebook
- OAuth / API key encryption vault

## Deploy

```powershell
cd forge-academy
npm run build
firebase deploy --only firestore:rules,hosting
```
