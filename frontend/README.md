# App Analytics Viewer

Local React dashboard for the `app-logs-db` D1 database.

The **ingest Worker** (`app-analytics`) stays write-only. Reads go through either:

1. **Public read Worker** (recommended) — `app-analytics-read` exposes GET-only JSON endpoints
2. **Local wrangler CLI** — optional; requires a Cloudflare API token with D1 access

D1 itself cannot be made “public”; you always need a Worker (or authenticated API) in front of it.

## Recommended setup (no local Cloudflare auth)

### 1. Deploy the read-only Worker

```bash
cd app-analytics-read
npm install
npx wrangler deploy
```

This deploys to `https://app-analytics-read.my-app-logs.workers.dev` (same account subdomain as your ingest Worker).

The read Worker only accepts **GET** requests and runs **SELECT** queries. It cannot insert data.

### 2. Point the frontend at it

```bash
cd frontend
cp .env.example .env
# Edit .env if your workers.dev URL differs
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

With `VITE_READ_API_URL` set, the app calls the remote read API directly — no local `wrangler d1 execute` and no D1 token needed on your machine.

## Alternative: local wrangler CLI

If you prefer not to expose a public read endpoint, fix your API token instead. Error `7403` means the token lacks D1 permission for this account.

Create or edit a token at [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) with:

- **Account → D1 → Read** (or Edit)
- **Account → Workers Scripts → Read** (optional, for `wrangler whoami`)

Then:

```bash
export CLOUDFLARE_API_TOKEN=your_token
cd frontend
npm run dev:local-d1
```

Leave `VITE_READ_API_URL` unset so `/api/*` is proxied to the local Node server on port `8788`.

## Date filtering migration

This **drops and recreates** `app_logs` (all existing rows are deleted):

```bash
cd app-analytics
npx wrangler d1 execute app-logs-db --remote --file=migrations/0002_add_created_at.sql
```

Then redeploy the read Worker:

```bash
cd app-analytics-read
npx wrangler deploy
```

New ingest requests will populate `created_at` automatically. Re-hit your ingest endpoint to seed test data if needed.

## Security note

The read Worker is intentionally public (CORS `*`, no auth). That is fine for non-sensitive aggregate data, but anyone with the URL can read your analytics. To restrict access later, add [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/access-controls/) or a shared secret header check on the read Worker only.

## Useful React libraries (alternatives)

| Need | Library | Notes |
|------|---------|-------|
| Choropleth map | **[react-simple-maps](https://www.react-simple-maps.io/)** (used here) | SVG world map + GeoJSON/TopoJSON; pairs well with `d3-scale` |
| Choropleth map | **[@nivo/geo](https://nivo.rocks/geo/)** | Higher-level API, polished defaults |
| Data table | **[@tanstack/react-table](https://tanstack.com/table)** | Sorting, pagination, column filters |
| Date range | **[react-day-picker](https://react-day-picker.js.org/)** | Calendar UI instead of native date inputs |
| Fetch/cache | **[@tanstack/react-query](https://tanstack.com/query)** | Loading states, refetch, cache |

## API routes (read Worker & local server)

| Route | Description |
|-------|-------------|
| `GET /api/logs?app=&from=&to=&limit=` | Recent rows |
| `GET /api/stats?app=&from=&to=` | Counts grouped by country |
| `GET /api/apps` | Distinct app names |
