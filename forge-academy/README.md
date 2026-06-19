# Forge Academy Management System (Pilot)

Statewide training platform for the Arkansas Fire Training Academy (AFTA). This pilot release (`1.0.0-pilot`) covers registration, attendance, skills, testing, certificates, certifications, transcripts, and reporting.

**Hosted app:** https://forge-academy-95f84.web.app  
**Firebase project:** `forge-academy-95f84`

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

## Build

```powershell
npm run build
npm run preview
```
