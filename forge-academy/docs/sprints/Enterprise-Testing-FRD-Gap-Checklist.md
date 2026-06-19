# Enterprise Testing FRD — Gap Checklist

Reference: `Forge_Academy_Enterprise_Testing_FRD.md`  
Live app: https://forge-academy-95f84.web.app

Legend: ✅ Complete · 🟡 Partial · ❌ Missing

| # | Module | Status | Notes / Next Sprint |
|---|--------|--------|---------------------|
| 1 | Grading & Results Hub | 🟡 | Core hub live; add bulk actions, SLA views |
| 2 | Test Assignments | 🟡 | Create/list live; add edit/cancel/reassign |
| 3 | Live Proctor Monitor | 🟡 | Pause/force submit/void live; add incident export |
| 4 | Test Categories | 🟡 | CRUD + defaults seeded |
| 5 | Question Banks | 🟡 | Import + pools; add version/retirement workflow |
| 6 | Question Analytics | 🟡 | Basic metrics + flags; add discrimination index UI |
| 7 | Test Blueprints | 🟡 | Pool counts + validation |
| 8 | Tests | 🟡 | Publish + locked versions |
| 9 | Eligibility Review | 🟡 | Manual checklist; add rule automation |
| 10 | Testing Windows | 🟡 | CRUD + status |
| 11 | Testing Rooms | 🟡 | Capacity + stations |
| 12 | Seat Assignments | 🟡 | Manual assignment |
| 13 | Proctor Assignments | 🟡 | Lead/assistant records |
| 14 | Accommodations | 🟡 | Record types; add approval lifecycle |
| 15 | Manual Grading Queue | 🟡 | Grade + recalculate; add rubrics |
| 16 | Retest Management | 🟡 | Request/approve; add policy engine |
| 17 | Remediation Management | 🟡 | Auto-assign on fail; add plan templates |
| 18 | Certificate Release Queue | 🟡 | Pending release workflow live |
| 19 | Challenge Testing | ✅ | Sprint 11A — admin + student + callables |
| 20 | State Certification Testing | ✅ | Sprint 11A — admin UI + callable |
| 21 | LMS Exam Integration | 🟡 | Sprint 11C — settings, CSV sync, eligibility + passback queue |
| 22 | Audit & Security Logs | 🟡 | Sprint 11A audit console; add export/retention |

## Executive Dashboard Widgets

| Widget | Status |
|--------|--------|
| Active exams | ✅ Sprint 11A |
| Students testing | ✅ Sprint 11A |
| Pass rate | ✅ Sprint 11A |
| Failure rate | ✅ Sprint 11A |
| Average score | ✅ Sprint 11A |
| Retests pending | ✅ |
| Remediation pending | ✅ |
| Certificates pending release | ✅ |
| Question review alerts | ✅ Sprint 11A |
| Manual grading queue | ✅ |
| Active proctors | ✅ Sprint 11A |

## Reporting Suite

| Report | Status | Target |
|--------|--------|--------|
| Pass/Fail CSV | ✅ | — |
| Remediation CSV | ✅ | — |
| Certificate Release CSV | ✅ | — |
| Student Testing Report | ✅ | Sprint 11B |
| Class Testing Report | ✅ | Sprint 11B |
| Instructor Report | ✅ | Sprint 11B |
| Question Analytics Report | ✅ | Sprint 11B |
| Certification Eligibility Report | ✅ | Sprint 11B |
| State Testing Report | ✅ | Sprint 11B |
| Parameterized filters (date/class/course/dept) | ✅ | Sprint 11B |
| Scheduled/automated exports | ✅ | Cloud Scheduler + Admin Reports download |
| Module toggle enforcement | ✅ | Nav + route guards from system settings |
| Audit log CSV export | ✅ | Testing audit page |
| LMS API webhook | ✅ | HTTP webhook + grade passback trigger |
| Cloud Functions Node 22 | ✅ | Upgraded from Node 20 |
| Profile photo upload gating | ✅ | Controlled by system settings |

## Recommended Sprint Roadmap

### Sprint 11B — Reporting Suite ✅
- Parameterized filters (date range, class, course, department)
- Student/class/instructor testing reports
- State testing and certification eligibility exports
- Question analytics CSV

### Sprint 11C — LMS Integration 🟡
- LMS connector settings (admin)
- Completion sync via CSV batch import
- Grade passback queue on certificate release
- Enforce `lmsMet` from imported LMS completion data
- Future: live API webhook + automated grade passback

### Phase 2 (FRD Future)
- Browser lockdown, webcam proctoring
- AI question generation / exam review
- SCORM / QTI imports

### Phase 3 (FRD Future)
- Mobile proctor app
- State testing portal integration
- Department self-service analytics
- AI remediation recommendations
