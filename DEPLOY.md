# Deploy Forge CMS Website

**New CMS site (deploy here):** https://forge-website-b276c.web.app  
Firebase project: **forge-website-b276c**  
Hosting site: **forge-website-b276c**

> **Do not deploy to the old site.** The legacy marketing site at forgepublicsafety.com uses a different Firebase project (`rms-dashboard-7562e`). This repo builds the **new Forge CMS** website on `forge-website-b276c`.
>
> Your homepage hero (Firefighter, EMS, Public Safety) and logo live in **ForgePS/ForgePS-Website** — they are synced into `public/assets/uploads/` and `content/media.json`.

## Deploy your website (use this)

The CMS website does **not** need Cloud Functions to work. Always use:

```powershell
npm install
npm run deploy
```

This deploys to **https://forge-website-b276c.web.app**.

Confirm your Firebase login matches the new project:

```powershell
npx firebase-tools projects:list
npx firebase-tools use forge-website-b276c
```

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
cd C:\Users\jerem\Projects\forgepublicsafety-website
git pull origin cursor/multi-program-cms-hub-1b94
npm install
npx firebase-tools login --reauth
npx firebase-tools use forge-website-b276c
npm run deploy
```

Wait for `Deploy complete!` then open:

- **Website:** https://forge-website-b276c.web.app
- **Admin:** https://forge-website-b276c.web.app/admin

---

## After deploy (required if you still see the old single-firefighter hero)

Browser localStorage can keep old CMS content after deploy. Force the seeded marketing site:

1. Open https://forge-website-b276c.web.app/admin (local login: any email / password `admin`)
2. **Settings → Restore default content**
3. Hard-refresh the public site (Ctrl+Shift+R)

You should then see:
- **Home:** Firefighter + EMS (red trauma bag) + Public Safety (hi-vis / tablet) hero
- **Nav:** Solutions · Products · Resources · Company
- **Products:** Forge RMS → https://rms.forgepublicsafety.com (Open live platform); other products → Request Demo
- **Footer Products:** deep links like `/products#forge-rms`

Assets (`content/media.json`):
- Hero: `/assets/uploads/hero-three-responders.png`
- Logo: `/assets/uploads/forge-logo-hero.png`

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
| `Assertion failed: resolving hosting target...` | Pull latest code, run `npx firebase-tools login --reauth`, then `npx firebase-tools use forge-website-b276c`, retry `npm run deploy` |
| `could not find site "forgepublicsafety-com"` | You are on old config — pull latest code; new site is `forge-website-b276c` |
| Functions timeout on deploy | Use `npm run deploy` (not `firebase deploy`) |
| Blank website after deploy | Admin → Settings → Restore default content |
| Still see old TinaCMS | Pull latest code, `npm run deploy` again |
| `firebase` not found | Use `npm run deploy` (uses `npx firebase-tools` automatically) |
| `firebase login:ci` / auth errors | Run `npx firebase-tools login --reauth` in PowerShell, then deploy again |
