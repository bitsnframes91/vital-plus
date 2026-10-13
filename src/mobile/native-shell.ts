import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

import { translateText } from "@/lib/language";
import { NATIVE_WEB_ORIGIN } from "@/lib/native-app";

// Custom URL scheme registered in ios/App/App/Info.plist.
export const APP_URL_SCHEME = "vivohealth";

// Maps an opened URL to an in-app path. Only our scheme and the hosted origin are
// accepted, and only plain relative paths, so links cannot load foreign content.
export function deepLinkPath(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  let path: string;
  if (url.protocol === `${APP_URL_SCHEME}:`)
    path = `/${url.host}${url.pathname}`.replace(/\/+$/, "") || "/";
  else if (url.origin === NATIVE_WEB_ORIGIN) path = url.pathname;
  else return null;
  if (!/^\/[A-Za-z0-9\-_/.]*$/.test(path) || path.startsWith("//") || path.includes(".."))
    return null;
  return path + url.search;
}

// Keeps status bar text readable against the in-app light/dark theme.
function syncStatusBar() {
  const apply = () => {
    const dark = document.documentElement.classList.contains("dark");
    void StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
  };
  apply();
  new MutationObserver(apply).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
}

// Server-dependent features (sync, AI, account) need a connection; say so instead of failing silently.
function showOfflineNotice() {
  const notice = document.createElement("div");
  notice.setAttribute("role", "status");
  notice.className = "native-offline-notice";
  const update = () => {
    notice.textContent = translateText(
      "Keine Internetverbindung. Anmeldung, Synchronisierung und KI-Funktionen sind erst wieder online verfügbar.",
    );
    notice.hidden = navigator.onLine;
  };
  update();
  document.body.appendChild(notice);
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
}

export function startNativeShell() {
  if (!Capacitor.isNativePlatform()) return;
  document.documentElement.dataset["nativeApp"] = Capacitor.getPlatform();
  syncStatusBar();
  showOfflineNotice();
  void App.addListener("appUrlOpen", ({ url }) => {
    const path = deepLinkPath(url);
    if (path && path !== location.pathname + location.search) location.assign(path);
  });
}
