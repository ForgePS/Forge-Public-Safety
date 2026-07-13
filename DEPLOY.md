# Deploy Forge CMS Website

Project: **forge-website-b276c**  
Live URL: https://forge-website-b276c.web.app

## Deploy your website (use this)

The CMS website does **not** need Cloud Functions to work. Always use:

```powershell
npm install
npm run deploy
```

This deploys **hosting + Firestore rules + Storage rules** only. Your site will go live.

Each build bundles default website content into `/cms-seed.json` so **https://forge-website-b276c.web.app** shows the marketing site even before anyone visits Admin.

If the live site is blank, pull the latest code and redeploy:

```powershell
git pull origin cursor/multi-program-cms-hub-1b94
npm install
npm run deploy
```

---

## Do NOT run bare `firebase deploy`

Running `firebase deploy` with no flags tries to deploy Cloud Functions and may fail with:

- `Couldn't find firebase-functions package`
- `User code failed to load... Timeout after 10000`

**Use `npm run deploy` instead** — it skips functions on purpose.

---

## Windows PowerShell (step by step)

```powershell
cd C:\Users\jerem\Projects\forge-cms-site
git pull
npm install
npm run deploy
```

Wait for `Deploy complete!` then open:

- **Website:** https://forge-website-b276c.web.app
- **Admin:** https://forge-website-b276c.web.app/admin

---

## After first deploy

1. Log in at `/admin`
2. If the site is empty: **Settings → Restore default content**
3. **Pages → Home** → Status: **Published** → **Save**

---

## Optional: deploy Cloud Functions later

Only needed for server-side form API endpoints (the CMS works without them):

```powershell
npm run deploy:functions
```

---

## Local development

```powershell
npm run dev
```

Open **http://localhost:5173** (port 5173, not 80).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Assertion failed: resolving hosting target...` | Pull latest code (adds `"site": "forge-website-b276c"` to `firebase.json`). Then run `firebase login --reauth` and retry `npm run deploy`. |
| Functions timeout on deploy | Use `npm run deploy` (not `firebase deploy`) |
| Blank website after deploy | Admin → Settings → Restore default content |
| Still see old TinaCMS | Pull latest code, `npm run deploy` again |
| `firebase` not found | Use `npm run deploy` (uses `npx firebase-tools` automatically) |
| `firebase login:ci` / auth errors | Run `firebase login --reauth` in PowerShell, then deploy again |
