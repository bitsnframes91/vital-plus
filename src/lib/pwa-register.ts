import { isNativeApp } from "./native-app";

// Single place that registers the app service worker. Never registers in dev,
// iframes, or Lovable preview hosts; `?sw=off` unregisters it.
const SW_URL = "/sw.js";

function isRefusedContext(): boolean {
  if (!import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const h = window.location.hostname;
  const blocked = ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"];
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  if (blocked.some((d) => h === d || h.endsWith(`.${d}`))) return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

async function unregisterAppWorkers() {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs
      .filter((r) => (r.active ?? r.waiting ?? r.installing)?.scriptURL.endsWith(SW_URL))
      .map((r) => r.unregister()),
  );
}

export function registerAppServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  // Capacitor serves bundled files itself; a worker would only add a second, stale cache.
  if (isNativeApp) return;
  if (isRefusedContext()) {
    void unregisterAppWorkers().catch(() => {});
    return;
  }
  void navigator.serviceWorker.register(SW_URL, { scope: "/" }).catch((e) => {
    console.error("Vitalplus: service worker registration failed", e);
  });
}
