# Decap CMS setup (browser editor)

Decap CMS gives you a visual editor at **`/admin`** on your live site — no AI, no JSON editing required.

After setup, your workflow is:

1. Open **https://forgepublicsafety-com.web.app/admin** (or **https://forgepublicsafety.com/admin** after DNS cutover)
2. Log in with GitHub
3. Edit pages in the sidebar → **Publish** (saves to GitHub)
4. GitHub Actions automatically rebuilds and deploys the site (about 2 minutes)

---

## One-time setup checklist

### 1. Put the project on GitHub

```powershell
cd C:\Users\jerem\Projects\forgepublicsafety-website
git init
git add .
git commit -m "Add Forge marketing site with Decap CMS"
```

Create a **private** repo on GitHub named `forgepublicsafety-website`, then:

```powershell
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/forgepublicsafety-website.git
git branch -M main
git push -u origin main
```

### 2. Update Decap config with your repo

Edit **`public/admin/config.yml`** — change this line:

```yaml
repo: YOUR_GITHUB_USERNAME/forgepublicsafety-website
```

Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username or org.

### 3. Create a GitHub OAuth App

GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**

| Field | Value |
|-------|-------|
| Application name | Forge Website CMS |
| Homepage URL | `https://forgepublicsafety.com` |
| Authorization callback URL | *(fill in after step 4 — see below)* |

Copy the **Client ID**. Generate a **Client secret** and save it somewhere safe.

### 4. Deploy the OAuth Cloud Function

Firebase Functions need the **Blaze (pay-as-you-go)** plan because the OAuth handler calls GitHub’s API.

```powershell
cd C:\Users\jerem\Projects\forgepublicsafety-website\functions
npm install
cd ..
firebase login
```

Set the client ID in **`functions/.env`** (copy from `.env.example`):

```
OAUTH_CLIENT_ID=your_github_oauth_client_id
```

Set the client secret:

```powershell
firebase functions:secrets:set OAUTH_CLIENT_SECRET
# paste your GitHub OAuth client secret when prompted
```

Deploy the OAuth function:

```powershell
firebase deploy --only functions:website-cms
```

After deploy, Firebase prints the function URL, e.g.:

`https://us-central1-rms-dashboard-7562e.cloudfunctions.net/cmsOAuth`

1. Put that URL in **`public/admin/config.yml`** as `base_url` (no trailing slash)
2. Set the GitHub OAuth **callback URL** to:  
   `https://us-central1-rms-dashboard-7562e.cloudfunctions.net/cmsOAuth/callback`
3. Commit, push, and redeploy hosting so `/admin` picks up the config change

### 5. Enable GitHub Actions auto-deploy

1. Firebase Console → Project settings → **Service accounts** → **Generate new private key**
2. GitHub repo → **Settings** → **Secrets and variables** → **Actions**
3. Add secret **`FIREBASE_SERVICE_ACCOUNT`** — paste the entire JSON key file contents
4. Push to `main` — the **Deploy website** workflow builds and publishes hosting

### 6. Deploy the site (first time)

```powershell
npm run build
firebase deploy --only hosting:marketing
```

Or push to `main` after GitHub Actions is configured.

---

## Local CMS preview (optional)

To test the editor on your PC without GitHub login:

```powershell
# Terminal 1
npm run dev

# Terminal 2
npm run cms:server
```

Open **http://localhost:5173/admin** — for local saves without GitHub, temporarily set `local_backend: true` in `public/admin/config.yml`, run `npm run cms:server` in a second terminal, then set it back to `false` before deploying.

---

## Who can edit?

Anyone with **write access** to the GitHub repo can log into `/admin`. Keep the repo private and only invite people who should edit the site.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Failed to load config.yml" | Run `npm run build` and redeploy — admin lives in `public/admin/` |
| GitHub login fails | Check OAuth callback URL matches function URL + `/callback` |
| Changes don't go live | Confirm GitHub Actions workflow ran after you clicked Publish |
| Invalid repo | Update `repo:` in `public/admin/config.yml` |

---

## Files reference

| Path | Purpose |
|------|---------|
| `public/admin/` | Decap CMS UI |
| `content/*.json` | All editable website copy |
| `functions/` | GitHub OAuth for login |
| `.github/workflows/deploy.yml` | Auto-deploy on push |
