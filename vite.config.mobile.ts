// Build for the Capacitor iOS shell: `bun run build:mobile` → dist-mobile/client.
// Same app source as vite.config.ts, but emitted as a static SPA (TanStack Start
// SPA mode prerenders index.html) instead of the SSR worker. Server functions
// still run on the hosted app; see src/mobile/start.ts and docs/ios/architecture.md.
// No PWA plugin: Capacitor serves the bundled files, a service worker would only add a stale cache.
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

// The generated Supabase client must not be edited, so the native build swaps its
// session storage module for the Keychain-backed one. Fails the build if the
// generated import ever changes, rather than silently falling back to localStorage.
function nativeAuthStorage(): Plugin {
  const replacement = fileURLToPath(
    new URL("./src/mobile/secure-auth-storage.ts", import.meta.url),
  );
  let applied = false;
  return {
    name: "vivo-native-auth-storage",
    enforce: "pre",
    resolveId(source, importer) {
      if (
        source !== "./previewAuthStorage" ||
        !importer?.replace(/\\/g, "/").endsWith("/src/integrations/supabase/client.ts")
      )
        return;
      if (this.environment.name === "client") applied = true;
      return replacement;
    },
    buildEnd() {
      if (this.environment.name === "client" && !applied) {
        this.error(
          "Supabase client no longer imports ./previewAuthStorage; update nativeAuthStorage() in vite.config.mobile.ts.",
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [nativeAuthStorage()],
  nitro: false,
  tanstackStart: {
    server: { entry: "server" },
    // The app imports the committed src/routeTree.gen.ts; this copy only absorbs the
    // mobile-specific type registration so the tracked file stays unchanged.
    router: { generatedRouteTree: "./mobile/routeTree.mobile.gen.ts" },
    start: { entry: "mobile/start" },
    client: { entry: "mobile/client" },
    spa: { enabled: true, prerender: { outputPath: "/index.html" } },
  },
  vite: {
    build: { outDir: "dist-mobile" },
    define: { "import.meta.env.VITE_NATIVE_APP": JSON.stringify("true") },
  },
});
