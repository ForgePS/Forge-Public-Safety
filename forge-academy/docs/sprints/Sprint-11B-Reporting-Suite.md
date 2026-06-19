# Sprint 11B — Enterprise Testing Reporting Suite

## Goal
Deliver the FRD reporting suite with parameterized filters and CSV exports.

## Delivered

### Report library (`src/lib/testingReports.js`)
Shared filters:
- Date range (start/end)
- Class session
- Course
- Department

### CSV exports
| Report key | File | Filters |
|------------|------|---------|
| `student` | Student testing report | Yes |
| `class` | Class testing report | Yes |
| `passFail` | Exam pass/fail export | Yes |
| `instructor` | Instructor testing report | Yes |
| `questionAnalytics` | Question analytics | No |
| `eligibility` | Certification eligibility | Yes |
| `state` | State testing report | Yes |
| `remediation` | Remediation assignments | No |
| `retest` | Retest requests | No |
| `certificateRelease` | Certificate release queue | No |

### UI
- `/admin/testing/reports` — filter panel + report cards with export feedback

## Test Plan
- [ ] Apply department + date filters; export student report
- [ ] Export class report with pass rates for a scheduled class
- [ ] Export question analytics after graded attempts exist
- [ ] Export eligibility and state testing reports

## Next: Sprint 11C
LMS exam integration — see `Enterprise-Testing-FRD-Gap-Checklist.md`
