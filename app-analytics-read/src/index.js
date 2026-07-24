const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

let schemaCache = null;

function jsonResponse(body, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders, "Content-Type": "application/json" },
	});
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

function sqliteTimestamp(date = new Date()) {
	return date.toISOString().slice(0, 19).replace("T", " ");
}

function cutoffDaysAgo(days) {
	const date = new Date();
	date.setUTCDate(date.getUTCDate() - days);
	return sqliteTimestamp(date);
}

function buildAppFilter(app) {
	if (!app) {
		return { where: "", binds: [] };
	}

	return {
		where: "WHERE app_name = ?",
		binds: [app],
	};
}

async function getSchema(db) {
	if (schemaCache) {
		return schemaCache;
	}

	try {
		await db.prepare("SELECT created_at FROM app_logs LIMIT 1").all();
		schemaCache = { hasCreatedAt: true };
	} catch {
		schemaCache = { hasCreatedAt: false };
	}

	return schemaCache;
}

function buildFilter(searchParams, hasCreatedAt) {
	const app = sanitizeAppName(searchParams.get("app"));
	const from = sanitizeDate(searchParams.get("from"));
	const to = sanitizeDate(searchParams.get("to"));

	const conditions = [];
	const binds = [];

	if (app) {
		conditions.push("app_name = ?");
		binds.push(app);
	}

	if (hasCreatedAt) {
		if (from) {
			conditions.push("created_at >= ?");
			binds.push(`${from} 00:00:00`);
		}
		if (to) {
			conditions.push("created_at <= ?");
			binds.push(`${to} 23:59:59`);
		}
	}

	const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
	return { where, binds, dateFilteringAvailable: hasCreatedAt };
}

async function handleLogs(db, searchParams, schema) {
	const limit = sanitizeLimit(searchParams.get("limit"), 100);
	const { where, binds } = buildFilter(searchParams, schema.hasCreatedAt);
	const dateExpr = schema.hasCreatedAt ? "date(created_at)" : "''";
	const groupBy = schema.hasCreatedAt
		? "app_name, country, date(created_at), page_url, referrer_url"
		: "app_name, country, page_url, referrer_url";
	const orderBy = schema.hasCreatedAt ? "MAX(created_at) DESC" : "count DESC";

	const result = await db
		.prepare(
			`SELECT
				app_name,
				country,
				${dateExpr} AS log_date,
				page_url,
				referrer_url,
				COUNT(*) AS count
			 FROM app_logs
			 ${where}
			 GROUP BY ${groupBy}
			 ORDER BY ${orderBy}
			 LIMIT ?`
		)
		.bind(...binds, limit)
		.all();

	return {
		rows: (result.results ?? []).map((row) => ({
			app_name: row.app_name,
			country: row.country,
			log_date: row.log_date || null,
			page_url: row.page_url,
			referrer_url: row.referrer_url,
			count: Number(row.count),
		})),
	};
}

async function handleStats(db, searchParams, schema) {
	const { where, binds } = buildFilter(searchParams, schema.hasCreatedAt);

	const result = await db
		.prepare(
			`SELECT country, COUNT(*) AS count
			 FROM app_logs
			 ${where}
			 GROUP BY country
			 ORDER BY count DESC`
		)
		.bind(...binds)
		.all();

	const rows = result.results ?? [];
	const byCountry = Object.fromEntries(
		rows.map((row) => [row.country, Number(row.count)])
	);
	const total = rows.reduce((sum, row) => sum + Number(row.count), 0);

	return { byCountry, total, rows };
}

async function handleApps(db) {
	const result = await db
		.prepare("SELECT DISTINCT app_name FROM app_logs ORDER BY app_name ASC")
		.all();

	return {
		apps: (result.results ?? []).map((row) => row.app_name),
	};
}

async function handleSummary(db, searchParams, schema) {
	const app = sanitizeAppName(searchParams.get("app"));
	const { where, binds } = buildAppFilter(app);

	if (!schema.hasCreatedAt) {
		const result = await db
			.prepare(`SELECT COUNT(*) AS all_time FROM app_logs ${where}`)
			.bind(...binds)
			.all();
		const count = Number(result.results?.[0]?.all_time ?? 0);

		return { week: count, month: count, year: count, allTime: count };
	}

	const weekCutoff = cutoffDaysAgo(7);
	const monthCutoff = cutoffDaysAgo(30);
	const yearCutoff = cutoffDaysAgo(365);

	const result = await db
		.prepare(
			`SELECT
				COUNT(*) AS all_time,
				SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS week,
				SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS month,
				SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS year
			 FROM app_logs
			 ${where}`
		)
		.bind(weekCutoff, monthCutoff, yearCutoff, ...binds)
		.all();

	const row = result.results?.[0] ?? {};

	return {
		week: Number(row.week ?? 0),
		month: Number(row.month ?? 0),
		year: Number(row.year ?? 0),
		allTime: Number(row.all_time ?? 0),
	};
}

async function handleTopUrls(db, searchParams, schema) {
	const topN = sanitizeTopN(searchParams.get("top"), 10);
	const { where, binds } = buildFilter(searchParams, schema.hasCreatedAt);
	const pageFilter = where
		? `${where} AND page_url IS NOT NULL AND page_url != ''`
		: "WHERE page_url IS NOT NULL AND page_url != ''";

	const result = await db
		.prepare(
			`SELECT page_url, COUNT(*) AS count
			 FROM app_logs
			 ${pageFilter}
			 GROUP BY page_url
			 ORDER BY count DESC
			 LIMIT ?`
		)
		.bind(...binds, topN)
		.all();

	return {
		rows: (result.results ?? []).map((row) => ({
			page_url: row.page_url,
			count: Number(row.count),
		})),
	};
}

export default {
	async fetch(request, env) {
		if (request.method === "OPTIONS") {
			return new Response(null, { headers: corsHeaders });
		}

		if (request.method !== "GET") {
			return jsonResponse({ error: "Method not allowed. This worker is read-only." }, 405);
		}

		const url = new URL(request.url);

		try {
			const schema = await getSchema(env.app_logs_db);

			if (url.pathname === "/" || url.pathname === "/api/health") {
				return jsonResponse({
					ok: true,
					worker: "app-analytics-read",
					endpoints: ["/api/logs", "/api/stats", "/api/summary", "/api/top-urls", "/api/apps"],
					dateFilteringAvailable: schema.hasCreatedAt,
				});
			}

			if (url.pathname === "/api/logs") {
				return jsonResponse(await handleLogs(env.app_logs_db, url.searchParams, schema));
			}

			if (url.pathname === "/api/stats") {
				return jsonResponse(await handleStats(env.app_logs_db, url.searchParams, schema));
			}

			if (url.pathname === "/api/summary") {
				return jsonResponse(await handleSummary(env.app_logs_db, url.searchParams, schema));
			}

			if (url.pathname === "/api/top-urls") {
				return jsonResponse(await handleTopUrls(env.app_logs_db, url.searchParams, schema));
			}

			if (url.pathname === "/api/apps") {
				return jsonResponse(await handleApps(env.app_logs_db));
			}

			return jsonResponse({ error: "Not found" }, 404);
		} catch (error) {
			return jsonResponse({ error: error.message }, 400);
		}
	},
};
