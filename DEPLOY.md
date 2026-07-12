# Deploy Forge CMS Website

Project: **forge-website-b276c**  
Live URL: https://forge-website-b276c.web.app

## Quick deploy (recommended)

From the project root:

```bash
npm install
npm run deploy:hosting
```

This builds the site and deploys **hosting + Firestore rules + Storage rules** — everything needed for the website and CMS to work. It skips Cloud Functions so deploy is fast and reliable.

## Full deploy (includes Cloud Functions)

```bash
npm install
npm run deploy
```

This also deploys form submission functions. The first time, Firebase installs function dependencies automatically.

## If `firebase deploy` failed with "Couldn't find firebase-functions"

Run this once, then deploy again:

```bash
cd functions
npm install
cd ..
npm run build
firebase deploy
```

Or use the npm script:

```bash
npm run functions:install
npm run deploy
```

## Step-by-step (Windows PowerShell)

```powershell
cd C:\Users\jerem\Projects\forge-cms-site
git pull
npm install
npm run deploy:hosting
```

## After deploy

1. Open https://forge-website-b276c.web.app — your public website
2. Open https://forge-website-b276c.web.app/admin — CMS admin (password: `admin` in local dev; configure Firebase Auth for production)
3. In admin: **Settings → Restore default content** if the site looks empty
4. **Pages → Home** → set status to **Published** → Save

## Local development

```bash
npm run dev
```

Open **http://localhost:5173** (not port 80).

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Functions deploy error | Use `npm run deploy:hosting` instead |
| Blank website | Admin → Settings → Restore default content |
| Old TinaCMS admin | Pull latest code, rebuild, redeploy |
| `firebase: command not found` | Use `npx firebase-tools deploy` |
