import { canonicalAppName } from "./appGroups.js";

export function mergeLogsResponses(responses, limit = 100) {
  const rows = responses
    .flatMap((response) => response.rows ?? [])
    .map((row) => ({
      ...row,
      app_name: canonicalAppName(row.app_name),
    }));

  rows.sort((left, right) => Number(right.id ?? 0) - Number(left.id ?? 0));
  return { rows: rows.slice(0, limit) };
}

export function mergeStatsResponses(responses) {
  const byCountry = {};
  let total = 0;

  for (const response of responses) {
    total += Number(response.total ?? 0);
    for (const [country, count] of Object.entries(response.byCountry ?? {})) {
      byCountry[country] = (byCountry[country] ?? 0) + Number(count);
    }
  }

  return { byCountry, total };
}

export function mergeSummaryResponses(responses) {
  return responses.reduce(
    (merged, response) => ({
      week: merged.week + Number(response.week ?? 0),
      month: merged.month + Number(response.month ?? 0),
      year: merged.year + Number(response.year ?? 0),
      allTime: merged.allTime + Number(response.allTime ?? 0),
    }),
    { week: 0, month: 0, year: 0, allTime: 0 }
  );
}

export function mergeRankedRows(responses, key, topN = 10) {
  const totals = new Map();

  for (const response of responses) {
    for (const row of response.rows ?? []) {
      const value = row[key];
      if (!value) {
        continue;
      }
      totals.set(value, (totals.get(value) ?? 0) + Number(row.count ?? 0));
    }
  }

  const rows = [...totals.entries()]
    .map(([value, count]) => ({ [key]: value, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, topN);

  return { rows };
}
