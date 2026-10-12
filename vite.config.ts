// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";
import { loadEnv } from "vite";
import path from "node:path";

// Load all env vars into process.env for server routes only (never added to
// envDefine, so secrets like SUPABASE_SERVICE_ROLE_KEY stay out of the client).
const serverEnv = loadEnv(process.env["NODE_ENV"] ?? "development", process.cwd(), "");
Object.assign(process.env, serverEnv);

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: {
        // React Email's htmlparser2 needs entities v4.5.0; bypass nested v7 copies.
        "entities/lib/decode.js": path.resolve(__dirname, "node_modules/entities/lib/decode.js"),
        "entities/lib/encode.js": path.resolve(__dirname, "node_modules/entities/lib/encode.js"),
        entities: path.resolve(__dirname, "node_modules/entities"),
      },
    },
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        devOptions: { enabled: false },
        filename: "sw.js",
        outDir: "dist/client",
        manifest: false,
        workbox: {
          globPatterns: ["**/*.{js,css,woff2,png,svg,webp,jpg,ico}"],
          navigateFallback: null,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) =>
                request.mode === "navigate" && !url.pathname.startsWith("/~oauth"),
              handler: "NetworkFirst",
              options: {
                cacheName: "vivo-pages",
                networkTimeoutSeconds: 4,
                precacheFallback: { fallbackURL: "/offline.html" },
              },
            },
            {
              urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/assets/"),
              handler: "CacheFirst",
              options: { cacheName: "vivo-assets", expiration: { maxEntries: 200 } },
            },
          ],
          additionalManifestEntries: [{ url: "/offline.html", revision: "1" }],
        },
      }),
    ],
  },
});
