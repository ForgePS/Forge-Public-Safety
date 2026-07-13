# Deploy Forge CMS Website

**Live site:** https://forge-website-b276c.web.app  
**Firebase project / hosting site:** `forge-website-b276c`

## Deploy (only this)

```powershell
git pull origin cursor/multi-program-cms-hub-1b94
npm install
npx firebase-tools use forge-website-b276c
npm run deploy
```

After deploy:
1. Open https://forge-website-b276c.web.app/admin (email anything, password `admin`)
2. **Settings → Hard reset from deployed seed**
3. You should land on the homepage with the **3-person hero**

Do **not** use Import unless you have an Admin-exported CMS backup JSON.

## Verify deploy worked

These must both succeed (image = real PNG, not HTML):

- https://forge-website-b276c.web.app/assets/hero-three-responders.png
- https://forge-website-b276c.web.app/cms-seed.json → home hero path should be `/assets/hero-three-responders.png`

If the hero URL returns a web page instead of a picture, the deploy did not upload assets — pull again and redeploy.

## Do NOT run bare `firebase deploy`

Use `npm run deploy` (hosting only). Bare `firebase deploy` tries Cloud Functions and fails.
