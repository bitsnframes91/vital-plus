import { createStart } from "@tanstack/react-start";

import { startInstance as webStart } from "../start";
import { NATIVE_WEB_ORIGIN } from "@/lib/native-app";

// Start entry for the Capacitor bundle (vite.config.mobile.ts). It keeps the web
// options and middleware and only sends server function calls to the hosted app,
// because the bundled UI is served from capacitor://localhost without a server.
export const startInstance = createStart(async () => ({
  ...(await webStart.getOptions()),
  serverFns: {
    fetch: (url: RequestInfo | URL, init?: RequestInit) =>
      fetch(typeof url === "string" && url.startsWith("/") ? NATIVE_WEB_ORIGIN + url : url, init),
  },
}));
