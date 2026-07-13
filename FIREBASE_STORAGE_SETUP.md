# Firebase Storage for CMS image uploads

Uploads were failing / filling browser storage because images were saved as
base64 inside `localStorage`. Configure Firebase Storage so images up to **10 MB**
are uploaded to the cloud and only the image URL is saved.

Project: **`forge-website-b276c`**

## 1. Create / open the web app config

1. Open [Firebase Console](https://console.firebase.google.com/project/forge-website-b276c/settings/general)
2. Under **Your apps**, open the Web app (or add one)
3. Copy the config object (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`)

## 2. Enable Storage + Anonymous Auth

1. **Build → Storage** → Get started (production mode is fine)
2. **Build → Authentication → Sign-in method → Anonymous → Enable**  
   (CMS signs in anonymously only to authorize Storage writes; page login can stay `admin`)
3. From this repo, deploy rules:

```powershell
cd C:\Users\jerem\Projects\forgepublicsafety-website
npx firebase-tools login
npx firebase-tools use forge-website-b276c
npm run deploy:rules
```

## 3. Add `.env.local` and rebuild hosting

```powershell
copy .env.example .env.local
notepad .env.local
```

Fill every `VITE_FIREBASE_*` value. Leave:

```env
VITE_FIREBASE_USE_FIRESTORE=false
```

unless you are ready to move page content into Firestore.

Then:

```powershell
npm run deploy
```

Vite bakes env vars into the JS bundle at **build time**, so hosting must be rebuilt after editing `.env.local`.

## 4. Verify

1. Hard refresh https://forge-website-b276c.web.app/admin
2. Settings → look for **Firebase Storage: connected**
3. Media Library / Live View → upload a 1–5 MB image
4. The saved URL should look like `https://firebasestorage.googleapis.com/...` (not `data:image/...`)

## Notes

- Without Storage configured, uploads stay in the browser and are limited to ~500 KB.
- Do **not** set `VITE_FIREBASE_USE_FIRESTORE=true` until CMS data exists in Firestore — it switches the whole CMS off localStorage.
- `.env.local` is gitignored; each machine / CI build that deploys hosting needs those values.
