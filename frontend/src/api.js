const API_BASE = (import.meta.env.VITE_READ_API_URL || "").replace(/\/$/, "");

function apiPath(path) {
  return API_BASE ? `${API_BASE}${path}` : path;
}

export async function fetchJson(path) {
  const response = await fetch(apiPath(path));

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }

  return response.json();
}

export function buildQuery(params) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") {
      search.set(key, value);
    }
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getLogs(filters) {
  return fetchJson(`/api/logs${buildQuery(filters)}`);
}

export function getStats(filters) {
  return fetchJson(`/api/stats${buildQuery(filters)}`);
}

export function getSummary(filters) {
  return fetchJson(`/api/summary${buildQuery(filters)}`);
}

export function getTopUrls(filters, topN = 10) {
  return fetchJson(`/api/top-urls${buildQuery({ ...filters, top: topN })}`);
}

export function getTopReferrers(filters, topN = 10) {
  return fetchJson(`/api/top-referrers${buildQuery({ ...filters, top: topN })}`);
}

export function getApps() {
  return fetchJson("/api/apps");
}
