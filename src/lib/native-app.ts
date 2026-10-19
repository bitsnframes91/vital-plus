// Build-time switch for the Capacitor (iOS) bundle built by vite.config.mobile.ts.
// Web builds never define VITE_NATIVE_APP, so it is false there and native branches never run.
export const isNativeApp = import.meta.env["VITE_NATIVE_APP"] === "true";

// Hosted origin that serves server functions and email links for the native bundle.
export const NATIVE_WEB_ORIGIN: string =
  import.meta.env["VITE_NATIVE_WEB_ORIGIN"] || "https://vital-plus.lovable.app";

// Absolute URL for links that leave the app (auth emails). Inside the native shell
// `window.location.origin` is `capacitor://localhost`, which no mail client can open.
export function publicAppUrl(path: string): string {
  return `${isNativeApp ? NATIVE_WEB_ORIGIN : window.location.origin}${path}`;
}
