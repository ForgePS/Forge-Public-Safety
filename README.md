# Forge Public Safety Marketing Site

Standalone marketing website for **forgepublicsafety.com**, rebuilt outside GoDaddy Airo.

See [INTEGRATION.md](./INTEGRATION.md) for planned cross-product APIs and identifiers.

## Repository layout (this Git remote)

| Path | Product | Status |
|------|---------|--------|
| `forge-academy/` | **Forge Academy** — primary application in this remote | Active |
| Root `src/`, `content/` | Legacy marketing site (`forgepublicsafety.com`) | Moving off-site |
| `ForgePS/Dashboard` | Org-wide RMS-fed digital signage | [Separate repo](https://github.com/ForgePS/Dashboard) |
| Forge RMS | Operations / records | Separate repo — `rms.forgepublicsafety.com` |

Academy architecture: [forge-academy/docs/ARCHITECTURE.md](./forge-academy/docs/ARCHITECTURE.md)

## What's included (marketing — root)

- Home, Products, Solutions, Resources, Company, Contact
- Privacy, Terms, Security
- **No pricing page** — `/pricing` redirects to `/contact`
- Links to live RMS at `https://rms.forgepublicsafety.com`

## Local development

```powershell
cd C:\Users\jerem\Projects\forgepublicsafety-website
npm install
npm run dev
```

## Build

```powershell
npm run build
```

## Deploy to Firebase Hosting

This project is configured for Firebase project `rms-dashboard-7562e`.

```powershell
npm run build
firebase deploy --only hosting:marketing
```

Until DNS is switched, preview the site at **https://forgepublicsafety-com.web.app** and the CMS at **https://forgepublicsafety-com.web.app/admin**.

### Point forgepublicsafety.com to Firebase

The marketing site is deployed to Firebase site **`forgepublicsafety-com`** (not the RMS app).

1. Firebase Console → **Hosting** → site **forgepublicsafety-com** → **Add custom domain** → `forgepublicsafety.com`
2. In GoDaddy: disconnect the domain from **Airo Builder** first
3. Add the DNS records Firebase shows (usually A records + TXT for verification)
4. Wait for SSL (can take up to 24 hours)

Until DNS switches, use **https://forgepublicsafety-com.web.app** and **https://forgepublicsafety-com.web.app/admin**.

## Demo form

The contact form opens a `mailto:demo@forgepublicsafety.com` message. Replace with Formspree, Firebase Functions, or another form backend when ready.

## Content editor (Decap CMS)

Browser-based editing at **`/admin`**. See **`DECAP-CMS-SETUP.md`** for one-time GitHub + OAuth setup, then **`EDITING.md`** for day-to-day use.

## Assets

Logo and hero image were copied from the live Airo site into `public/assets/`.
