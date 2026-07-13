# Deploy — Website style update (correct marketing site)

This branch restores the **Website style update** design:
- Rugged/tactical Forge look (chrome + orange + black)
- Team hero (`hero-team.png` — firefighter, EMS, incident command)
- Product lines: `/products/rms`, `/products/industrial-safety`, `/products/academy`

**Folder:** `C:\Users\jerem\Projects\forgepublicsafety-website`  
**Live:** https://forge-website-b276c.web.app

## Deploy

```powershell
cd C:\Users\jerem\Projects\forgepublicsafety-website
git fetch origin
git checkout -B cursor/multi-program-cms-hub-1b94 origin/cursor/multi-program-cms-hub-1b94
git reset --hard origin/cursor/multi-program-cms-hub-1b94
git clean -fd
npm install
npx firebase-tools use forge-website-b276c
npm run deploy
```

Then open https://forge-website-b276c.web.app — not `/cms`, not Restore/Import.

## Optional: your real product emblems

If you still have `forge-rms.png`, `forge-industrial-safety.png`, and `forge-academy.png` from the style-update chat, copy them into `public/assets/uploads/` and redeploy (placeholders ship until then).
