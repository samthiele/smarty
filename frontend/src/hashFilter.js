import { canonicalAppName } from "./appGroups.js";

function parseHashApp(hash) {
  const raw = decodeURIComponent(String(hash || "").replace(/^#/, "").trim());
  if (!raw) {
    return "all";
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(raw)) {
    return "all";
  }
  return canonicalAppName(raw);
}

export function appFromHash(hash = window.location.hash) {
  return parseHashApp(hash);
}

export function hashFromApp(app) {
  if (!app || app === "all") {
    return "";
  }
  return `#${app}`;
}

export function setAppHash(app) {
  const nextHash = hashFromApp(app);
  const currentHash = window.location.hash;

  if (currentHash === nextHash || (!currentHash && !nextHash)) {
    return;
  }

  const url = `${window.location.pathname}${window.location.search}${nextHash}`;
  window.history.replaceState(null, "", url);
}
