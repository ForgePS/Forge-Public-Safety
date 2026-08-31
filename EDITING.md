# Edit your website (no AI required)

## Option A — Browser editor (local /admin)

Use **Forge CMS** at **`/admin`**.

1. Open **`/admin`** on your CloudFront domain (or http://localhost:5173/admin locally)
2. Local login: any email with password `admin`
3. Pick a page from the sidebar, edit, and save
4. For production, keep canonical copy in **`content/*.json`**, commit, and push — GitHub Actions deploys to **S3 + CloudFront**

---

## Option B — Edit JSON files directly

All website copy lives in **`content/*.json`**:

| File | What it controls |
|------|------------------|
| `global.json` | Site name, emails, nav menu |
| `home.json` | Homepage |
| `products-page.json` | Products page copy + base package list |
| `product-modules.json` | Core product cards |
| `addon-modules.json` | Add-on module cards |
| `solutions.json` | Solutions page |
| `company.json` | About page |
| `contact.json` | Contact page |
| `resources.json` | Resources page |
| `footer.json` | Footer links |

### Preview locally

Double-click **`preview.bat`** or run `npm run dev` → http://localhost:5173

### Publish manually

Double-click **`publish.bat`** (requires AWS CLI + `AWS_S3_BUCKET` / `AWS_CLOUDFRONT_DISTRIBUTION_ID`) or push to `main`

---

## Swap images

Replace files in **`public/assets/`** (keep the same filename):

- `forge-logo.png` — header/footer logo
- `hero-firefighter.png` — homepage hero background

Uploaded images from Decap CMS go to **`public/assets/uploads/`**.

---

## No pricing page

Old `/pricing` links redirect to Contact automatically.

---

## Folder map

| Path | What it is |
|------|------------|
| `content/*.json` | Editable copy |
| `public/admin/` | Decap CMS editor |
| `public/assets/` | Logo and images |
| `preview.bat` | Local preview |
| `publish.bat` | Manual deploy |
| `DECAP-CMS-SETUP.md` | One-time CMS setup guide |
