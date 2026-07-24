import { spawn } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKER_DIR = path.resolve(__dirname, "../../app-analytics");
const DATABASE_NAME = "app-logs-db";
const PORT = 8788;

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}


function sanitizeAppName(value) {
  if (value == null || value === "" || value === "all") {
    return null;
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new Error("Invalid app name. Use letters, numbers, _ or - only.");
  }
  return value;
}

function sanitizeDate(value) {
  if (value == null || value === "") {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Invalid date. Use YYYY-MM-DD.");
  }
  return value;
}

function sanitizeLimit(value, fallback = 100) {
  const parsed = Number.parseInt(value ?? fallback, 10);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 1000) {
    throw new Error("Limit must be between 1 and 1000.");
  }
  return parsed;
}

function sanitizeTopN(value, fallback = 10) {
  const parsed = Number.parseInt(value ?? fallback, 10);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 50) {
    throw new Error("Top N must be between 1 and 50.");
  }
  return parsed;
}

function sqlString(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

function buildWhereClause({ app, from, to }) {
  const clauses = [];

  if (app) {
    clauses.push(`app_name = ${sqlString(app)}`);
  }
  if (from) {
    clauses.push(`created_at >= ${sqlString(`${from} 00:00:00`)}`);
  }
  if (to) {
    clauses.push(`created_at <= ${sqlString(`${to} 23:59:59`)}`);
  }

  return clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
}

function buildAppWhereClause(app) {
  return app ? `WHERE app_name = ${sqlString(app)}` : "";
}

function cutoffDaysAgo(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function runD1Query(sql) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["wrangler", "d1", "execute", DATABASE_NAME, "--remote", "--json", "--command", sql],
      {
        cwd: WORKER_DIR,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || stdout.trim() || `wrangler exited with code ${code}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        const first = Array.isArray(parsed) ? parsed[0] : parsed;

        if (first?.error) {
          reject(new Error(first.error.text || "D1 query failed"));
          return;
        }

        resolve(first?.results ?? []);
      } catch {
        reject(new Error(`Could not parse wrangler output: ${stdout}`));
      }
    });
  });
}

async function handleLogs(searchParams) {
  const app = sanitizeAppName(searchParams.get("app"));
  const from = sanitizeDate(searchParams.get("from"));
  const to = sanitizeDate(searchParams.get("to"));
  const limit = sanitizeLimit(searchParams.get("limit"), 100);
  const where = buildWhereClause({ app, from, to });

  const rows = await runD1Query(
    `SELECT
      app_name,
      country,
      date(created_at) AS log_date,
      page_url,
      referrer_url,
      COUNT(*) AS count
     FROM app_logs
     ${where}
     GROUP BY app_name, country, date(created_at), page_url, referrer_url
     ORDER BY MAX(created_at) DESC
     LIMIT ${limit};`
  );

  return {
    rows: rows.map((row) => ({
      app_name: row.app_name,
      country: row.country,
      log_date: row.log_date,
      page_url: row.page_url,
      referrer_url: row.referrer_url,
      count: Number(row.count),
    })),
  };
}

async function handleStats(searchParams) {
  const app = sanitizeAppName(searchParams.get("app"));
  const from = sanitizeDate(searchParams.get("from"));
  const to = sanitizeDate(searchParams.get("to"));
  const where = buildWhereClause({ app, from, to });

  const rows = await runD1Query(
    `SELECT country, COUNT(*) AS count FROM app_logs ${where} GROUP BY country ORDER BY count DESC;`
  );

  const byCountry = Object.fromEntries(
    rows.map((row) => [row.country, Number(row.count)])
  );
  const total = rows.reduce((sum, row) => sum + Number(row.count), 0);

  return { byCountry, total, rows };
}

async function handleApps() {
  const rows = await runD1Query(
    "SELECT DISTINCT app_name FROM app_logs ORDER BY app_name ASC;"
  );

  return {
    apps: rows.map((row) => row.app_name),
  };
}

async function handleSummary(searchParams) {
  const app = sanitizeAppName(searchParams.get("app"));
  const where = buildAppWhereClause(app);
  const weekCutoff = sqlString(cutoffDaysAgo(7));
  const monthCutoff = sqlString(cutoffDaysAgo(30));
  const yearCutoff = sqlString(cutoffDaysAgo(365));

  const rows = await runD1Query(
    `SELECT
      COUNT(*) AS all_time,
      SUM(CASE WHEN created_at >= ${weekCutoff} THEN 1 ELSE 0 END) AS week,
      SUM(CASE WHEN created_at >= ${monthCutoff} THEN 1 ELSE 0 END) AS month,
      SUM(CASE WHEN created_at >= ${yearCutoff} THEN 1 ELSE 0 END) AS year
     FROM app_logs
     ${where};`
  );

  const row = rows[0] ?? {};

  return {
    week: Number(row.week ?? 0),
    month: Number(row.month ?? 0),
    year: Number(row.year ?? 0),
    allTime: Number(row.all_time ?? 0),
  };
}

async function handleTopUrls(searchParams) {
  const app = sanitizeAppName(searchParams.get("app"));
  const from = sanitizeDate(searchParams.get("from"));
  const to = sanitizeDate(searchParams.get("to"));
  const topN = sanitizeTopN(searchParams.get("top"), 10);
  const where = buildWhereClause({ app, from, to });
  const pageFilter = where
    ? `${where} AND page_url IS NOT NULL AND page_url != ''`
    : "WHERE page_url IS NOT NULL AND page_url != ''";

  const rows = await runD1Query(
    `SELECT page_url, COUNT(*) AS count
     FROM app_logs
     ${pageFilter}
     GROUP BY page_url
     ORDER BY count DESC
     LIMIT ${topN};`
  );

  return {
    rows: rows.map((row) => ({
      page_url: row.page_url,
      count: Number(row.count),
    })),
  };
}

async function handleTopReferrers(searchParams) {
  const app = sanitizeAppName(searchParams.get("app"));
  const from = sanitizeDate(searchParams.get("from"));
  const to = sanitizeDate(searchParams.get("to"));
  const topN = sanitizeTopN(searchParams.get("top"), 10);
  const where = buildWhereClause({ app, from, to });
  const referrerFilter = where
    ? `${where} AND referrer_url IS NOT NULL AND referrer_url != ''`
    : "WHERE referrer_url IS NOT NULL AND referrer_url != ''";

  const rows = await runD1Query(
    `SELECT referrer_url, COUNT(*) AS count
     FROM app_logs
     ${referrerFilter}
     GROUP BY referrer_url
     ORDER BY count DESC
     LIMIT ${topN};`
  );

  return {
    rows: rows.map((row) => ({
      referrer_url: row.referrer_url,
      count: Number(row.count),
    })),
  };
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      res.end();
      return;
    }

    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    if (url.pathname === "/api/health") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (url.pathname === "/api/logs") {
      sendJson(res, 200, await handleLogs(url.searchParams));
      return;
    }

    if (url.pathname === "/api/stats") {
      sendJson(res, 200, await handleStats(url.searchParams));
      return;
    }

    if (url.pathname === "/api/summary") {
      sendJson(res, 200, await handleSummary(url.searchParams));
      return;
    }

    if (url.pathname === "/api/top-urls") {
      sendJson(res, 200, await handleTopUrls(url.searchParams));
      return;
    }

    if (url.pathname === "/api/top-referrers") {
      sendJson(res, 200, await handleTopReferrers(url.searchParams));
      return;
    }

    if (url.pathname === "/api/apps") {
      sendJson(res, 200, await handleApps());
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`D1 API listening on http://127.0.0.1:${PORT}`);
  console.log(`Using wrangler project: ${WORKER_DIR}`);
});
