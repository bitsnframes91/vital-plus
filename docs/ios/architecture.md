# iOS architecture decision

Status: accepted (branch `feature/ios-capacitor`, October 2026)

## Findings from the repository audit

| Area | What the code does | Consequence for iOS |
|---|---|---|
| Rendering | TanStack Start 1.168 with SSR; `vite build` emits a Nitro worker (`cloudflare-module`) in `.output/`. No `index.html` is produced; `dist/client` only holds the PWA worker. | The web build output cannot be bundled into an app as-is. |
| Routing | 19 file routes, all client-renderable. `sitemap.xml` is the only server route. No route uses server loaders. | Every screen works as a client-only SPA. |
| Data | `src/lib/store.tsx` reads/writes `user_data` directly through the Supabase JS client (RLS-protected, publishable key). Auth is Supabase email/password through Lovable Cloud. | Works from any origin. Supabase allows cross-origin requests. |
| Server functions | 5 `createServerFn` RPCs: `analyzeLabPdf`, `mealFromVoice`, `mealNutrition`, `mealFromPhoto` (Lovable AI Gateway, `LOVABLE_API_KEY`) and `deleteAccount` (service-role key). All use `requireSupabaseAuth` (bearer token). | Need the hosted server; secrets must never ship in the app. |
| Server-function protection | `src/start.ts` installs TanStack's CSRF middleware (same-origin only). No CORS headers. Verified on production: `capacitor://localhost` gets **HTTP 403** for both preflight and POST. | A native client is blocked until the server allows its origin. |
| Server-function IDs | Deterministic hashes of file + export. They're identical in the web build and the mobile build (verified). | A mobile bundle can call the deployed server as long as both come from compatible commits. |
| PWA | `vite-plugin-pwa` worker registered only from `src/lib/pwa-register.ts`. | WKWebView doesn't run service workers for `capacitor://`. The native shell skips it. |

## Options evaluated

**A — Package the existing client output.** Rejected. There is no standalone client output (`dist/client` has no HTML or app chunks), and the SSR shell needs a server for every navigation.

**B — Separate mobile client build sharing all source (selected).** Use TanStack Start's built-in SPA mode to prerender a static `index.html` shell. Every route, component, style and library stays shared. The client still calls the hosted server for the 5 server functions.

**C — Remote WebView wrapper (`server.url`).** Rejected per requirements: not a native app, breaks offline launch, and is the pattern App Review guideline 4.2 targets.

## How option B is implemented

```
vite.config.ts          → web (unchanged): SSR + Nitro + PWA      → .output/
vite.config.mobile.ts   → iOS: SPA mode, nitro:false, no PWA      → dist-mobile/client → cap sync → ios/App/App/public
```

- `vite.config.mobile.ts` reuses `@lovable.dev/vite-tanstack-config` with:
  - `spa.prerender.outputPath: "/index.html"`
  - `start.entry: "mobile/start"` and `client.entry: "mobile/client"`
  - a build-time flag `VITE_NATIVE_APP=true`
- `src/mobile/start.ts` reuses the web `startInstance` options (same middleware, including Supabase bearer attachment). It only adds `serverFns.fetch`, which prefixes `/_serverFn/...` with `VITE_NATIVE_WEB_ORIGIN` (default `https://vital-plus.lovable.app`).
- `src/mobile/client.tsx` is TanStack's default hydration plus `startNativeShell()`, which handles:
  - status bar style that follows the in-app theme
  - `vivohealth://` deep links, validated by `deepLinkPath`
  - an offline notice
- `src/mobile/secure-auth-storage.ts` replaces the generated `previewAuthStorage` module in the mobile build only. A guarded Vite `resolveId` hook does the swap, so the auto-generated Supabase client is not edited. Sessions are stored in the iOS Keychain by the in-app plugin `ios/App/App/SecureSessionStoragePlugin.swift`.
- Server side (Lovable), `src/start.ts` lets the CSRF check accept the native origins listed in `src/lib/native-origins.ts` for cross-site server-function requests, and `src/server.ts` answers their CORS preflight and adds CORS headers.

### Why the server change is safe

- Browsers set `Origin` themselves; no web page can send `capacitor://localhost`.
- Server functions authenticate with a bearer token rather than cookies, so there is no ambient credential for a cross-site attacker to ride.
- Allowed methods and headers are limited to what the RPC client sends.
- Verified locally against the built server handler:

| Request | Status |
|---|---|
| Native preflight | 204 |
| Evil-origin preflight | 403 |
| Native POST | passes CSRF |
| Same-origin POST | passes CSRF (unchanged) |
| Cross-site / same-site subdomain / no-origin POST | 403 (unchanged) |

## Trade-offs and constraints

1. **AI features and account deletion on iOS need production CORS support for `capacitor://localhost`** (implemented by Lovable; requirements in `PHASE-2B-VOICE-HANDOFF.md`). Until then, those 5 calls fail on iOS with HTTP 403. Login, data sync and all local features work without it. Publishing is a separate, manual decision.
2. **Version coupling.** The app talks to whatever server version is deployed. Server-function signatures must stay backwards compatible while older app versions are in use. Renaming or moving a `*.functions.ts` export changes its ID.
3. **Web bundle impact.** The shared files gain a few `isNativeApp` checks. On the web the flag is `false` at runtime. No Capacitor code enters the web bundle (verified: 0 references in `.output/public/assets`).
4. **Android later.** Nothing is iOS-specific outside `ios/`, `SecureSessionStoragePlugin.swift` and `NATIVE_APP_ORIGINS`. For Android:
   - run `cap add android`
   - add an Android Keystore storage plugin
   - `https://localhost` (Capacitor's Android origin) is already in `NATIVE_APP_ORIGINS` (`src/lib/native-origins.ts`)
