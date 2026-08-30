// Apps that should be treated as one tool in filters and summaries.
export const APP_GROUPS = {
  ispec: ["ispec", "ispec2"],
};

export function canonicalAppName(app) {
  for (const [canonical, members] of Object.entries(APP_GROUPS)) {
    if (members.includes(app)) {
      return canonical;
    }
  }
  return app;
}

export function groupAppsForFilter(apps) {
  const seen = new Set();
  const grouped = [];

  for (const app of [...apps].sort()) {
    const canonical = canonicalAppName(app);
    if (!seen.has(canonical)) {
      seen.add(canonical);
      grouped.push(canonical);
    }
  }

  return grouped;
}

export function expandAppFilter(app) {
  if (!app || app === "all") {
    return null;
  }

  return APP_GROUPS[app] ?? [app];
}

export function isGroupedApp(app) {
  return app != null && app !== "all" && Boolean(APP_GROUPS[app]);
}
