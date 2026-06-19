# Sprint 11A — Enterprise Testing FRD Gaps (State Cert, Challenge, Audit, Dashboard)

## Goal
Close the highest-priority gaps identified in the Enterprise Testing FRD after Sprints 10A–10C.

## Delivered

### State Certification Testing (FRD §20)
- Admin page: `/admin/testing/state-certification`
- Record state written/practical outcomes via `recordStateCertificationTestCallable`
- Collection: `stateCertificationTests`
- Audit action: `state_certification_recorded`

### Challenge Testing (FRD §19)
- Admin page: `/admin/testing/challenge`
- Student page: `/student/challenge-testing`
- Callables: `submitChallengeTestRequestCallable`, `reviewChallengeTestRequestCallable`
- Collection: `challengeTestRequests`
- Workflow: requested → approved/denied → completed

### Testing Audit Log (FRD §22)
- Admin page: `/admin/testing/audit`
- Filters by action and entity type
- Surfaces grading, release, retest, challenge, and state cert events

### Executive Dashboard (FRD)
Expanded `getTestingDashboardMetricsCallable` and admin dashboard widgets:
- Active exams / students testing now
- Pass rate, failure rate, average score
- Active proctors
- Manual grading queue
- Question review alerts
- Retests & remediation pending
- Certificates pending release (+ challenge pending count)

## Routes Added
- `/admin/testing/state-certification`
- `/admin/testing/challenge`
- `/admin/testing/audit`
- `/student/challenge-testing`

## Deploy
```powershell
cd forge-academy
npm run build
firebase deploy --only firestore:rules,functions,hosting
```

## Test Plan
- [ ] Admin records a state certification test for a student
- [ ] Student submits challenge request; admin approves and completes
- [ ] Audit log shows challenge and state cert events
- [ ] Dashboard testing widgets populate after graded attempts exist
- [ ] Live monitor shows active sessions when a student is taking a test
