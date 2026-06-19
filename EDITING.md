# Edit your website (no AI required)

## Option A — Browser editor (recommended)

Use **Decap CMS** at **`/admin`** on your live site.

1. Open **https://forgepublicsafety-com.web.app/admin** (or `/admin` on your domain after DNS cutover)
2. Log in with GitHub
3. Pick a page from the sidebar, edit, click **Publish**
4. The site redeploys automatically (via GitHub Actions)

**First-time setup:** see **`DECAP-CMS-SETUP.md`**

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

Double-click **`publish.bat`** or run `npm run build` then `firebase deploy --only hosting:marketing`

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
