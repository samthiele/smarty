# Smarty

App usage analytics: Cloudflare Workers (ingest + read API) and a React dashboard (**Smarty**).

| Directory | Purpose |
|-----------|---------|
| `app-analytics/` | Ingest Worker — records visits via `fetch(?app=...)` |
| `app-analytics-read/` | Read-only API for the dashboard |
| `frontend/` | Smarty React app (local dev + GitHub Pages) |

## Smarty on GitHub Pages

The workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) builds `frontend/` on every push to `main` and publishes to GitHub Pages.

**Live URL (after setup):** `https://<your-github-username>.github.io/smarty/`

### One-time setup

1. **Create the GitHub repo** named `smarty` (empty, no README is fine).

2. **Remove nested git repo** if present (only one git root should exist):
   ```bash
   rm -rf app-analytics/.git
   ```

3. **Push this project** from the repository root:
   ```bash
   cd /path/to/cloudflareAnalytics
   git init
   git add .
   git commit -m "Initial commit: Smarty analytics stack"
   git branch -M main
   git remote add origin git@github.com:<YOUR_USERNAME>/smarty.git
   git push -u origin main
   ```

4. **Enable GitHub Pages** in the repo on GitHub:
   - **Settings → Pages**
   - **Build and deployment → Source:** `GitHub Actions` (not “Deploy from a branch”)

5. After the first workflow run succeeds, open:
   `https://<YOUR_USERNAME>.github.io/smarty/`

### Configuration

The Pages build sets these at compile time:

| Variable | Value |
|----------|--------|
| `VITE_READ_API_URL` | `https://app-analytics-read.my-app-logs.workers.dev` |
| `VITE_BASE` | `/smarty/` |

To change the read API URL, edit the `env` block in `.github/workflows/deploy-pages.yml`.

If you rename the repo, update `VITE_BASE` to `/<repo-name>/`.

### Local development

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

See [`frontend/README.md`](frontend/README.md) for details.

### Cloudflare Workers

Deploy separately with Wrangler (not via GitHub Pages):

```bash
cd app-analytics && npx wrangler deploy
cd app-analytics-read && npx wrangler deploy
```
