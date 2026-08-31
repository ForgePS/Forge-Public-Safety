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

## Deploy to AWS (S3 + CloudFront)

The marketing site is a static Vite build served from **S3** behind **CloudFront**. Nothing for this site deploys to Firebase.

```powershell
npm run build
# or double-click publish.bat after setting AWS env vars
```

### GitHub Actions secrets

Repo → **Settings** → **Secrets and variables** → **Actions**:

| Secret | Purpose |
|--------|---------|
| `AWS_ACCESS_KEY_ID` | IAM user/key allowed to write the bucket + invalidate CloudFront |
| `AWS_SECRET_ACCESS_KEY` | Matching secret |
| `AWS_S3_BUCKET` | Bucket name for the built `dist/` site |
| `AWS_CLOUDFRONT_DISTRIBUTION_ID` | Distribution ID in front of that bucket |

Optional variable: `AWS_REGION` (defaults to `us-east-1`).

Push to `main` (or run **Deploy website**) syncs `dist/` to S3 and invalidates CloudFront.

### CloudFront SPA routing

Point the distribution origin at the S3 bucket (Origin Access Control). Add custom error responses so deep links work:

- **403** and **404** → response path `/index.html`, response code **200**

### Custom domain

1. Request/attach an ACM certificate in **us-east-1** for `forgepublicsafety.com`
2. Add the domain as a CloudFront alternate domain name
3. In DNS, point the domain to the CloudFront distribution (ALIAS/CNAME)

## Demo form

The contact form opens a `mailto:demo@forgepublicsafety.com` message. Replace with Formspree, API Gateway, or another form backend when ready.

## Content Management (Forge CMS)

The marketing site is powered by **Forge CMS** — a visual website management platform. Public pages seed from `content/*.json` (no Firebase).

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

### Production publish path

1. Edit `content/*.json` (or use local `/admin` then export/sync into `content/`)
2. Commit and push to `main` — GitHub Actions deploys to S3/CloudFront
3. Or run `publish.bat` / AWS CLI sync locally with the env vars above

### Legacy Decap CMS

Decap CMS files may remain under `public/admin/` for reference but are not the production editor.

## Assets

Logo and hero image were copied from the live Airo site into `public/assets/`.
