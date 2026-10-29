# Vivo Health — iOS app

The iOS app is a Capacitor 8 shell around a **bundled** build of the same React/TanStack Start code that runs the website. It does not load the website. Server functions (AI analysis, account deletion) are called on the hosted app. Background and trade-offs are in [architecture.md](architecture.md).

The other documents:
- [privacy-checklist.md](privacy-checklist.md): health-data review and App Privacy draft
- [app-store-readiness.md](app-store-readiness.md): Apple account, listing and review guidelines

**Verification status:**
- ✔ verified on macOS without Xcode (Command Line Tools only)
- ☐ not verified yet, because it needs Xcode or a device

## Requirements

| Tool | Version | Notes |
|---|---|---|
| Bun | 1.4.x | The repository lockfile is `bun.lock` (`brew install oven-sh/bun/bun`). |
| Node.js | 22 LTS | Needed by the Capacitor CLI (≥ 22) and the tests. On Node 25, six existing tests fail because Node's experimental global `localStorage` shadows jsdom's. |
| Xcode | 26.x | Only for compiling and running the app. Without Xcode, use the GitHub Actions build. |
| CocoaPods | not needed | Capacitor 8 uses Swift Package Manager. |

## Commands

```sh
bun install --frozen-lockfile     # ✔
bun run build                     # ✔ web build — unchanged, still SSR + PWA
bun run build:mobile              # ✔ static SPA bundle → dist-mobile/client
bun run ios:sync                  # ✔ build:mobile + `cap sync ios` (copies the bundle, updates Package.swift)
bun run ios:open                  # ☐ opens ios/App/App.xcodeproj in Xcode
bun run test                      # ✔ under Node 22 (110 tests)
bunx tsc --noEmit                 # ✔
```

Compile for the Simulator without signing. This is the same command CI runs; it hasn't been run locally because Xcode isn't installed:

```sh
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath build/DerivedData CODE_SIGNING_ALLOWED=NO build
```

Run in the Simulator (☐, needs Xcode): `bun run ios:open`, pick an iPhone simulator, then Run. To use the CI artifact instead:
1. Unzip `VivoHealth-simulator.app.zip`.
2. Run `xcrun simctl install booted App.app`.
3. Run `xcrun simctl launch booted com.fairvital.vivohealth`.

**After every web code change, run `bun run ios:sync` again.** The bundled files in `ios/App/App/public` are generated and git-ignored.

## What is where

| Path | Purpose |
|---|---|
| `vite.config.mobile.ts` | Mobile build. It:<br>• enables SPA mode, with no Nitro and no PWA<br>• uses the mobile entries<br>• swaps in the Keychain session storage<br>• rewrites CDN asset URLs to absolute ones |
| `capacitor.config.ts` | App name, bundle ID `com.fairvital.vivohealth`, `webDir`, iOS web view settings |
| `src/mobile/start.ts` | Web start options plus `serverFns.fetch` → hosted origin |
| `src/mobile/client.tsx`, `native-shell.ts`, `native.css` | Hydration, status bar, deep links (`vivohealth://…`), offline notice, safe areas |
| `src/mobile/secure-auth-storage.ts` | Supabase session storage backed by the iOS Keychain |
| `src/lib/native-app.ts` | `isNativeApp` flag and `publicAppUrl()` for auth email links |
| `ios/App/App/SecureSessionStoragePlugin.swift`, `MainViewController.swift` | In-app Keychain plugin and its registration |
| `ios/App/App/VitalHealthPlugin.swift`, `App.entitlements` | Apple Health (HealthKit) plugin and its entitlement. See [PHASE-2C-APPLE-HEALTH-HANDOFF.md](PHASE-2C-APPLE-HEALTH-HANDOFF.md) |
| `src/lib/apple-health/`, `src/components/AppleHealth.tsx` | Apple Health bridge, device-only state, import, export planning and UI |
| `ios/App/App/Info.plist` | Display name, permissions (camera, microphone, Health read/write), URL scheme, iPhone portrait |
| `ios/App/App/PrivacyInfo.xcprivacy` | Privacy manifest: collected data types (no tracking) and the `UserDefaults` reason `CA92.1` |
| `ios/App/App.xcodeproj` | Bundle ID, Team `R9RKNU986H`. Debug signs automatically; Release signs manually with Apple Distribution and the profile named by `VIVO_APPSTORE_PROFILE` |
| `src/start.ts` | Server: CSRF accepts the app origin `capacitor://localhost` for server functions only (CORS is provided by Lovable in production) |

## Environment configuration

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env` (committed by Lovable; publishable values) | — | Supabase client (same as web) |
| `VITE_NATIVE_WEB_ORIGIN` | build environment | `https://vital-plus.lovable.app` | Server functions, auth email links, CDN assets |

No secret is bundled into the app. `LOVABLE_API_KEY` and the service-role key stay on the server.

## GitHub Actions

### `.github/workflows/ios-build.yml`

Runs on manual dispatch and on pushes to `feature/ios-capacitor`. It uses `macos-26` because Capacitor 8 needs Xcode 26 and this is the GitHub-hosted arm64 image that has it. Steps:

1. Install with the frozen lockfile.
2. Check that the build variables exist (names only, values never printed).
3. Typecheck.
4. Lint strictly on the iOS-related files.
5. Lint the full repository, **report only**: `main` already has 1,736 Prettier/ESLint problems.
6. Run the tests.
7. Run the web build.
8. Run `ios:sync`.
9. Select Xcode 26.
10. `xcodebuild` for the Simulator with signing disabled.
11. Upload artifacts: `VivoHealth-simulator-app` (an unsigned **Simulator** `.app`, not an IPA) and `ios-build-logs`.

Permissions are `contents: read`. Actions are pinned to commit SHAs.

### `.github/workflows/ios-release.yml`

Signed App Store build. Started manually, or called by `ios-testflight-upload.yml`. It does nothing unless the variable `IOS_RELEASE_ENABLED` is `true`, and it runs in the `ios-release` environment, whose required reviewers must approve before any secret is read. Setup is in [app-store-readiness.md](app-store-readiness.md#1-apple-developer-and-app-store-connect).

Inputs: `marketing_version` (e.g. `1.0.0`), optional `build_number`, and `upload` (default **off**: sign, export and validate the IPA only).

Steps:
1. Check that the secrets exist (names only) and that the bundle ID and team in the workflow, the Xcode project and `capacitor.config.ts` agree.
2. Upload runs only: find the App Store Connect app with exactly `com.fairvital.vivohealth` and pick the next build number: higher than every uploaded build, and at least 2. A requested `build_number` must satisfy the same rule.
3. Typecheck, unit tests, mobile bundle, `cap sync ios`.
4. Import the certificate into a temporary keychain and verify the profile: App Store type, App ID `R9RKNU986H.com.fairvital.vivohealth`, not expired, issued for the imported Apple Distribution certificate.
5. Archive and verify the archive.
6. Export the IPA and validate it: bundle ID, version, build number, privacy manifest, web assets, embedded profile, Apple Distribution signature, no `get-task-allow`. Upload it as a 7-day artifact.
7. Upload runs only, and only from a manual dispatch or a push to `feature/ios-testflight-upload`: upload the same archive to App Store Connect for TestFlight.
8. Delete the keychain, keys and profile files.

Runs are serialized (job-level concurrency group `ios-release`), so two uploads can't pick the same build number.

### `.github/workflows/ios-testflight-upload.yml`

The dedicated TestFlight upload path. It runs only on a push to `feature/ios-testflight-upload` in `bitsnframes91/vital-plus` while `IOS_RELEASE_ENABLED` is `true`.

A guard job without secrets requires the pushed commit to already be on `feature/ios-capacitor`. Then the workflow calls `ios-release.yml` with `upload: true` and version `1.0.0`. The upload goes to TestFlight only: nothing is submitted for review or released.

Upload a reviewed commit:

```sh
git push origin feature/ios-capacitor                                 # the commit must be here first
git push origin feature/ios-capacitor:refs/heads/feature/ios-testflight-upload
```

Then approve the `ios-release` deployment in the run.

### `.github/workflows/ios-testflight-native.yml`

TestFlight upload from `feature/ios-native-enhancements` (Phases 2A–2C, HealthKit). It starts **only** when a release tag is pushed; ordinary pushes to the branch run just the unsigned Simulator build. A tag works even though this workflow is not on the default branch (GitHub shows *Run workflow* only for workflows on the default branch).

```sh
git fetch origin
git tag -a ios-native-testflight-v1.0.0-<label> origin/feature/ios-native-enhancements -m "TestFlight: <what changed>"
git push origin ios-native-testflight-v1.0.0-<label>
```

- Format: `ios-native-testflight-v<MARKETING_VERSION>-<label>`; the version must equal `MARKETING_VERSION` in the Xcode project, and the tagged commit must be on `feature/ios-native-enhancements`. Use a new label for every upload.
- Then approve the `ios-release` deployment in the run. If the environment limits deployment branches/tags, allow the tag pattern `ios-native-testflight-v*`.
- The build number is the next free number in App Store Connect. The profile must grant every entitlement in `ios/App/App/App.entitlements` (HealthKit); the archive and IPA are checked for them too.

## Device / Simulator test plan (☐ all pending)

1. **Launch.** Expect: splash, then `/`. No content under the notch or Dynamic Island. Bottom nav sits above the home indicator.
2. **Register.** The confirmation email link opens **the website** (`vital-plus.lovable.app/heute`), not the app. Then log in inside the app.
3. **Session.** Log in, kill the app, relaunch: still logged in (Keychain). Delete and reinstall: logged out.
4. **Log out.** No previous profile or health data is visible. Log in as a second account: only that account's data.
5. **Password reset.** The email link opens the website reset page.
6. **Food photo / lab upload.** Camera prompt with the German purpose text; photo library picker opens without a permission prompt. The AI result only arrives after the server change is published; before that, expect the error state (HTTP 403).
7. **Voice meal.** Microphone prompt; recording works (WKWebView `getUserMedia`).
8. **Shopware product link.** Opens Safari; returning to the app keeps the screen.
9. **Settings.** The status bar shows dark text over the light-only theme. In-app reminders appear while the app is open.
10. **Airplane mode.** The offline notice appears; it disappears when back online.
11. **Deep link.** `xcrun simctl openurl booted vivohealth://ernaehrung` opens Ernährung.
12. **Account deletion** (after the server change is published). The code email arrives, the account is deleted, and the app returns to `/`.

## Troubleshooting

- **`xcodebuild: error: tool 'xcodebuild' requires Xcode`:** only Command Line Tools are installed. Use CI or install Xcode 26.
- **AI features or account deletion fail with 403 on iOS:** production doesn't allow `capacitor://localhost` via CORS yet (Lovable; see PHASE-2B-VOICE-HANDOFF.md).
- **Images missing:** the device is offline. Mascot, logo and product images load from the hosted origin.
- **Build error "Supabase client no longer imports ./previewAuthStorage":** Lovable regenerated `src/integrations/supabase/client.ts` with a different import. Update `nativeAuthStorage()` in `vite.config.mobile.ts`. The build fails on purpose instead of silently storing tokens in `localStorage`.
- **Lint in CI is red but the job is green:** that's the report-only full-repository lint; see Known issues.
- **SPM package resolution fails:** Xcode downloads `capacitor-swift-pm` 8.5.3 from GitHub, so network access is required.

## Known issues

- Production must allow `capacitor://localhost` via CORS (Lovable) before the AI features and account deletion work on iOS.
- `main` already fails `bun run lint` (formatting). This branch adds no new problems: the count is 1,736 before and after.
- On Node 25, 6 existing tests fail for environmental reasons (see Requirements). On Node 22 all pass.
- In local web builds the `vite-plugin-pwa` precache is empty ("precache 1 entries"), apparently because `outDir: dist/client` doesn't match Nitro's `.output/public`. Lovable's deploy pipeline may differ. This is web-only and unchanged by this work; worth a separate look.
- Mascot, logo and product images need network access on iOS.
- The app icon is upscaled from 512 px.

## Security considerations

- The app ships no secrets. Server functions keep their keys server-side.
- The CSRF allowlist accepts exactly `capacitor://localhost` for `/_serverFn` only. Other origins (including other `capacitor://` hosts), cross-site and no-origin requests are still rejected (verified locally).
- Sessions live in the Keychain (this device only, after first unlock), are excluded from backups, and are cleared on reinstall.
- Deep links accept only `vivohealth://` and the hosted origin, and only plain in-app paths (`deepLinkPath`, unit-tested).
- No new third-party SDKs: the native plugins are the official `@capacitor/app` and `@capacitor/status-bar`.

## Android later

1. Run `bunx cap add android` (same `dist-mobile/client`).
2. Port `SecureSessionStoragePlugin` to the Android Keystore (EncryptedSharedPreferences).
3. Add `https://localhost` to `NATIVE_APP_ORIGINS` in `src/start.ts`.
4. Add Android to the ESLint/Prettier ignores, which are already listed.

## iPad

- The app targets iPhone and iPad (`TARGETED_DEVICE_FAMILY = "1,2"`). iPhone stays portrait-only; iPad supports
  all four orientations (`UISupportedInterfaceOrientations~ipad`) and therefore Split View / Slide Over.
- No setting is needed for full screen: the scene manifest, launch storyboard, device family and orientations
  allow full-screen and resizable windows, and `UIRequiresFullScreen` is deliberately absent (deprecated in
  iPadOS 26, see Apple TN3192). In iPadOS 26 "Windowed Apps" mode the system picks and remembers each app's window
  size; no API lets an app request full screen at launch. In "Full Screen Apps" mode, or after maximising the
  window once, the app opens full screen.
- In the iOS app, `AppShell` fills the whole window with a full-width tab bar (no desktop "phone card").
  Dashboards (`width="wide"`, default) use their md grids at full width. Forms and lists (`width="narrow"`: login,
  password reset, confirmation, Labor, Profil and its sections, feedback) and onboarding keep a readable 720 px
  column from 640 px on, while their header band spans the window (`data-native-width` in `native.css`). On iPad,
  the start artwork's off-white ground is lifted to white so it does not show as a pale panel. Dialogs stay within
  the screen and scroll. Below 640 px (iPhone, narrow Split View) the layout is unchanged; the web app keeps its
  existing layout.
- Layout check in headless Chrome: `bun run build:mobile && node scripts/ios-layout-check.mjs` renders the main
  screens at iPhone SE, iPhone 15 Pro, iPad mini, iPad, iPad Pro 13" (portrait and landscape) and iPad Split View,
  and fails on horizontal overflow, the phone frame or a cut-off dialog. It does not replace testing on a real iPad.
- App Store: with iPad support, an App Store submission needs iPad screenshots (13" iPad). TestFlight does not.

## Syncing Lovable releases

Merge `origin/vital-plus` into a temporary branch from `feature/ios-native-enhancements` and resolve by
hand; never overwrite mobile files wholesale. Rules that a merge does not enforce on its own:

- Apple Health files (`src/lib/apple-health/*`, `AppleHealth*.tsx`, their tests and translations) are
  newer on the mobile branch. Take Lovable's edits only if `git diff <last synced vital-plus commit>
  origin/vital-plus` shows any; a clean merge can also bring back code the mobile branch removed
  (e.g. the imported-weight line on Gesundheit).
- Every link that goes into an email (`emailRedirectTo`, `redirectTo`) uses `publicAppUrl(...)`; inside
  the app `window.location.origin` is `capacitor://localhost`, which no mail client can open.
- Lovable's `src/lib/native-fetch.ts` (imported by `src/start.ts`) rewrites relative `fetch` URLs to the
  hosted app. The mobile bundle already sends server functions there through `src/mobile/start.ts` and
  `serverFetch` with absolute URLs, so the patch passes them through unchanged.
- The theme can be dark: `syncStatusBar` in `src/mobile/native-shell.ts` follows the `.dark` class.
- Keep the Capacitor packages pinned exactly (`@capacitor/core` must match `@capacitor/ios`), regenerate
  `bun.lock` with bun 1.4.3 and check `bun install --frozen-lockfile`.
- The open-source license inventory must list the Capacitor packages the app ships. Lovable generates it
  on Linux; add missing packages instead of regenerating on another OS, which swaps platform packages.
- Server changes (CORS for `capacitor://localhost`, email templates) take effect only when Lovable
  publishes; check production before releasing a build that depends on them.
