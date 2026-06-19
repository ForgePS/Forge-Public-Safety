# Forge Academy Management System (Pilot)

Statewide training platform for the Arkansas Fire Training Academy (AFTA). This pilot release (`1.0.0-pilot`) covers registration, attendance, skills, testing, certificates, certifications, transcripts, and reporting.

**Hosted app:** https://forge-academy-95f84.web.app  
**Firebase project:** `forge-academy-95f84`

## Architecture

Forge Academy is one product in the Forge Public Safety ecosystem (alongside Forge RMS and [ForgePS/Dashboard](https://github.com/ForgePS/Dashboard)). Each product has its own repo and Firebase project; they integrate via APIs, not shared databases.

- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — product map, Campus Signage vs org Dashboard, design principles  
- **[docs/INTEGRATION.md](./docs/INTEGRATION.md)** — shared IDs, planned RMS/Dashboard APIs, integration rules  
- **[docs/API_CONTRACTS.md](./docs/API_CONTRACTS.md)** — draft HTTP contracts (v0.1)  
- **[docs/for-dashboard/](./docs/for-dashboard/)** — copy into [ForgePS/Dashboard](https://github.com/ForgePS/Dashboard) repo  
- **[templates/forge-dashboard-scaffold/](./templates/forge-dashboard-scaffold/)** — minimal Vite player + admin starter for Dashboard repo  

**Campus Signage** (class schedules, dining, TV displays) is built into this app (`/admin/digital-dashboard`, `/display/...`). **ForgePS/Dashboard** is a separate repo for RMS-fed org-wide signage.

## Quick start

```powershell
cd forge-academy
copy .env.example .env
# Fill VITE_FIREBASE_* values from Firebase console → Project settings → Web app
npm install
npm run dev
```

Sign in with a Firebase Auth user that has a matching `users/{uid}` document and the correct `role`.

## Pilot release checklist

After signing in as an academy admin, open **Admin → Pilot Release** (`/admin/pilot`) for:

- Automated smoke checks (Firestore, analytics, assets)
- Manual go-live checklist (saved in browser)
- Role-based training walkthroughs
- Deployment and migration notes

## Deploy

```powershell
npm run deploy          # build + hosting + Firestore rules
npm run deploy:hosting  # build + hosting only
npm run deploy:rules    # Firestore rules only
```

Requires the Firebase CLI logged in with access to `forge-academy-95f84`.

## Seed pilot demo data

Creates a sample department, certification type, course, and open class when those collections are empty:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\service-account.json"
npm run pilot:seed
```

Download a service account key from Firebase console → Project settings → Service accounts.

## User setup (migration)

1. Create Firebase Auth accounts for pilot users.
2. Add `users/{uid}` documents with `role`: `super_admin`, `academy_admin`, `student`, `department`, `instructor`, or `certification_officer`.
3. Link students: create `students` records with `userId` set to the student's Auth uid.
4. Link instructors: create `instructors` records with `userId` set to the instructor's Auth uid.
5. Link department users: set `departmentId` on the `users` document.

## Portals

| Role | Path |
|------|------|
| Academy admin | `/admin` |
| Student | `/student` |
| Department | `/department` |
| Instructor | `/instructor` |
| Certification officer | `/certification` |
| Public certificate verify | `/verify/:validationCode` |
| Campus signage admin | `/admin/digital-dashboard` |
| Campus signage player | `/display/:displayId/:publicKey` |

## Build

```powershell
npm run build
npm run preview
```
