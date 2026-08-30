import { expandAppFilter } from "./appGroups.js";
import {
  getLogs,
  getStats,
  getSummary,
  getTopReferrers,
  getTopUrls,
} from "./api.js";
import {
  mergeLogsResponses,
  mergeRankedRows,
  mergeStatsResponses,
  mergeSummaryResponses,
} from "./mergeAppData.js";
import { toAppFilter, toQueryFilters } from "./components/Filters.jsx";

async function fetchForApps(baseFilters, appCodes, fetcher) {
  if (!appCodes) {
    return fetcher(baseFilters);
  }

  return Promise.all(
    appCodes.map((app) => fetcher({ ...baseFilters, app }))
  );
}

export async function loadDashboardData(filters, topN = 10) {
  const query = toQueryFilters(filters);
  const appQuery = toAppFilter(filters);
  const appCodes = expandAppFilter(filters.app);
  const { app: _app, ...queryWithoutApp } = query;
  const { app: _summaryApp, ...summaryWithoutApp } = appQuery;

  const [
    logsResponses,
    statsResponses,
    summaryResponses,
    topUrlsResponses,
    topReferrersResponses,
  ] = await Promise.all([
    fetchForApps(queryWithoutApp, appCodes, getLogs),
    fetchForApps(queryWithoutApp, appCodes, getStats),
    fetchForApps(summaryWithoutApp, appCodes, getSummary),
    fetchForApps(queryWithoutApp, appCodes, (params) => getTopUrls(params, topN)),
    fetchForApps(queryWithoutApp, appCodes, (params) =>
      getTopReferrers(params, topN)
    ),
  ]);

  const limit = Number.parseInt(filters.limit ?? "100", 10) || 100;

  return {
    rows: mergeLogsResponses(
      Array.isArray(logsResponses) ? logsResponses : [logsResponses],
      limit
    ).rows,
    stats: mergeStatsResponses(
      Array.isArray(statsResponses) ? statsResponses : [statsResponses]
    ),
    summary: mergeSummaryResponses(
      Array.isArray(summaryResponses) ? summaryResponses : [summaryResponses]
    ),
    topUrls: mergeRankedRows(
      Array.isArray(topUrlsResponses) ? topUrlsResponses : [topUrlsResponses],
      "page_url",
      topN
    ).rows,
    topReferrers: mergeRankedRows(
      Array.isArray(topReferrersResponses)
        ? topReferrersResponses
        : [topReferrersResponses],
      "referrer_url",
      topN
    ).rows,
  };
}
