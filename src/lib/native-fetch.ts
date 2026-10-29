import { isNativeAppOrigin, PUBLISHED_APP_URL } from "./native-origins";

// In a Capacitor shell the page runs from capacitor://localhost, so relative
// server-function URLs must be sent to the published app instead.
export function installNativeFetch() {
  if (typeof window === "undefined") return;
  if (!isNativeAppOrigin(window.location.origin)) return;
  if (window.location.port) return; // local dev server, keep relative calls
  const w = window as Window & { __vpNativeFetch?: boolean };
  if (w.__vpNativeFetch) return;
  w.__vpNativeFetch = true;
  const original = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (typeof input === "string" && input.startsWith("/")) {
      return original(PUBLISHED_APP_URL + input, init);
    }
    if (input instanceof URL && input.origin === window.location.origin) {
      return original(PUBLISHED_APP_URL + input.pathname + input.search, init);
    }
    if (input instanceof Request && input.url.startsWith(window.location.origin)) {
      const url = PUBLISHED_APP_URL + input.url.slice(window.location.origin.length);
      return original(new Request(url, input), init);
    }
    return original(input, init);
  };
}

installNativeFetch();
