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

## Content Management (Forge CMS)

The marketing site is powered by **Forge CMS** — a full visual website management platform.

### Admin Panel

Access the CMS at **`/admin`**. Local development login: any email with password `admin`.

The admin panel provides complete control over:

- **Visual Page Builder** — drag-and-drop sections, 30+ block types, undo/redo, desktop/tablet/mobile preview
- **Global Branding** — logos, colors, fonts, container widths
- **Navigation & Footer Builders** — menus, dropdowns, columns, legal links
- **Media Library** — images, documents, alt text management
- **Forms Builder** — custom fields, validation, submission export
- **Collections** — repeatable content (products, team, FAQs, blog posts)
- **SEO Management** — per-page meta, redirects, robots.txt, sitemap
- **Popups & Banners** — scheduled notices, modals, announcement bars
- **Email Templates** — editable system emails with variable placeholders
- **Roles & Permissions** — 9 configurable roles with granular access
- **Version History** — automatic change tracking with restore capability
- **Settings** — business info, analytics, maintenance mode, cookie banner

See **`CMS-AUDIT-REPORT.md`** for the full customization audit.

### Production Setup

1. Create a Firebase project and enable Firestore, Auth, and Storage
2. Copy `.env.example` to `.env.local` and fill in Firebase config
3. Add GitHub Actions secret **`FIREBASE_SERVICE_ACCOUNT`** (full service account JSON from Firebase Console → Project settings → Service accounts → Generate new private key). See `DECAP-CMS-SETUP.md` section 5.
4. Alternatively, add **`FIREBASE_TOKEN`** from `npx firebase-tools login:ci` as a fallback
5. Deploy: `firebase deploy --only hosting:marketing,firestore:rules,functions`

### Legacy Decap CMS

The previous Decap CMS at `/admin` has been replaced by Forge CMS. Decap files remain in `public/admin/` for reference but are no longer used.

## Assets

Logo and hero image were copied from the live Airo site into `public/assets/`.
