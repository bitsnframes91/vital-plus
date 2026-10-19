import { createStart } from "@tanstack/react-start";

import { startInstance as webStart } from "../start";
import { serverFetch } from "@/lib/server-fetch";

// Start entry for the Capacitor bundle (vite.config.mobile.ts). It keeps the web
// options and middleware and only sends server function calls to the hosted app,
// because the bundled UI is served from capacitor://localhost without a server.
export const startInstance = createStart(async () => ({
  ...(await webStart.getOptions()),
  serverFns: { fetch: serverFetch },
}));
