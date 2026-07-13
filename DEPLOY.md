# Deploy Forge marketing website

**Folder on your PC:** `C:\Users\jerem\Projects\forgepublicsafety-website`  
**Live URL:** https://forge-website-b276c.web.app

The public marketing site now uses the **real ForgePS page structure** (Home, Products, Solutions, Resources, Company, Contact) — same layout/wiring as ForgePS-Website — not the generic CMS block template. Admin CMS stays at `/admin`.

## Deploy (PowerShell)

```powershell
cd C:\Users\jerem\Projects\forgepublicsafety-website

git merge --abort 2>$null
git fetch origin
git checkout -B cursor/multi-program-cms-hub-1b94 origin/cursor/multi-program-cms-hub-1b94
git reset --hard origin/cursor/multi-program-cms-hub-1b94
git clean -fd

npm install
npx firebase-tools use forge-website-b276c
npm run deploy
```

Then open https://forge-website-b276c.web.app — you should see Solutions / Products / Resources / Company, Request Demo, 3-person hero, and Products → Forge RMS live link.

**Do not use Import or Restore to “fix” the marketing homepage.** That CMS seed path is no longer what the public marketing host renders.

Verify the hero file is a real image:  
https://forge-website-b276c.web.app/assets/hero-three-responders.png
