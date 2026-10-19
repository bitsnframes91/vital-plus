# Phase 2C — Apple Health (HealthKit): handoff

Branch: `feature/ios-native-enhancements` · Base: `165e9c1`

**Native status: NOT compiled locally and NOT tested on an iPhone.** This Mac has only the Xcode
Command Line Tools, so the Swift plugin is unverified until the GitHub Simulator build compiles it.
A passing web build does not prove that HealthKit works. Signed builds (TestFlight) **will fail**
until HealthKit is enabled on the App ID and the App Store profile is regenerated (see below).

## Architecture

```
React (AppleHealth.tsx) ──► src/lib/apple-health/* ──► Capacitor bridge "VitalHealth"
     │  reads only                                       │
     ▼                                                    ▼
useStore() (synced to Supabase)          ios/App/App/VitalHealthPlugin.swift
  meals, waterLog, weightLog  ──export──►   HKHealthStore (read / write own samples)
                                            Application Support/VitalHealth/<sha256>.json
```

Decisions:

1. **Own narrow Swift plugin, no third-party package.** About 380 lines with Apple's HealthKit and
   Foundation only, registered like the existing Keychain plugin (`MainViewController.swift`). It
   covers exactly the 8 read types and 4 write types below. No Capacitor or SPM dependency changes.
2. **Imported data never enters the synced store.** `src/lib/store.tsx` uploads its entire state to
   Supabase on every change, so Apple Health data lives in a separate React context
   (`AppleHealthController`) and a native per-account file. The component only *reads* the store.
3. **Device-only, per-account cache.** One JSON file per account in Application Support, named by
   `SHA-256("vitalplus-apple-health:v1:" + userId)`. Written with `NSFileProtectionComplete`, the
   directory is excluded from iCloud/computer backups, the raw user ID is never stored. It holds the
   intro choice, connection flag, last sync, the last 7-day summary, export switches and the export
   ledger.
4. **Exports are reconciled, not hooked in.** Meal, water and weight screens are unchanged. A planner
   compares the app's entries with the ledger and writes or removes only what changed.
5. **Duplicates are prevented twice.** Every written sample has `HKMetadataKeySyncIdentifier =
   vitalplus.<accountTag>.<recordId>` and a `HKMetadataKeySyncVersion`. The plugin skips a write
   when its own sample with that identifier has the same or a higher version; HealthKit itself
   replaces this app's older version. The ledger avoids rewriting unchanged values at all.
6. **Imports exclude this app's own samples** (`NOT predicateForObjects(from: HKSource.default())`),
   so values Vital Plus wrote are never shown as "imported" and never re-exported.

## Files

| File | Purpose |
|---|---|
| `ios/App/App/VitalHealthPlugin.swift` | HealthKit bridge: availability, authorization, bounded reads, writes/deletes of own samples, protected per-account file |
| `ios/App/App/App.entitlements` | `com.apple.developer.healthkit = true` (no clinical records, no background delivery) |
| `ios/App/App/Info.plist` | `NSHealthShareUsageDescription`, `NSHealthUpdateUsageDescription` (German, like the existing strings) |
| `ios/App/App/MainViewController.swift` | Registers `VitalHealthPlugin` next to `SecureSessionStoragePlugin` |
| `ios/App/App.xcodeproj/project.pbxproj` | Swift file in Sources; `CODE_SIGN_ENTITLEMENTS = App/App.entitlements` (Debug + Release) |
| `src/lib/apple-health/bridge.ts` | Typed plugin contract; `null` on the web/hosted app |
| `src/lib/apple-health/summary.ts` | Unit conversion and validation of imported values |
| `src/lib/apple-health/sync.ts` | Bounded import with cancellation and retry |
| `src/lib/apple-health/export-plan.ts` | What to write/delete; ledger updates |
| `src/lib/apple-health/device-state.ts` | Per-account state, keys, disconnect |
| `src/components/AppleHealth.tsx` | Provider/controller, one-time intro, profile section |
| `src/components/AppShell.tsx`, `src/routes/__root.tsx`, `src/routes/profil.$section.tsx` | Wiring; "Verbundene Apps" notice now points to the Apple Health section |
| `src/lib/translations.json` | 48 new de/en/es strings |
| `src/test/apple-health*.test.ts(x)` | 42 new tests |

## HealthKit types and permissions

Read (requested together after the user taps *Apple Health verbinden*):

| App field | HealthKit identifier | Unit | Query |
|---|---|---|---|
| Steps | `HKQuantityTypeIdentifierStepCount` | count | daily `cumulativeSum` |
| Heart rate | `HKQuantityTypeIdentifierHeartRate` | count/min | daily `discreteAverage`/`Min`/`Max` (average shown) |
| Weight | `HKQuantityTypeIdentifierBodyMass` | kg | newest sample in range |
| Sleep | `HKCategoryTypeIdentifierSleepAnalysis` | minutes | asleep stages only (not *in bed*/*awake*), overlapping sources merged, night counted on the wake-up day |
| Dietary energy | `HKQuantityTypeIdentifierDietaryEnergyConsumed` | kcal | daily sum |
| Active energy | `HKQuantityTypeIdentifierActiveEnergyBurned` | kcal | daily sum |
| Resting (basal) energy | `HKQuantityTypeIdentifierBasalEnergyBurned` | kcal | daily sum |
| Water | `HKQuantityTypeIdentifierDietaryWater` | mL | daily sum |

- **Bounded:** today plus the previous 6 days (native clamps any request to 1–31 days). No history
  import, no background delivery, no observer queries.
- **Missing ≠ zero:** days without samples have no value and show *Keine Daten*. HealthKit does not
  reveal denied read access, so the UI says *Keine Daten* can also mean "not allowed".
- **Units:** the JS layer accepts only known units (kcal/kJ, mL/L/fl oz, kg/g/lb, count/min,
  count/s, min/h) and drops implausible values instead of guessing.
- **Energy kinds are kept apart:** active (movement), resting (basal metabolism) and dietary
  (eaten) are separate fields with their own explanation text.

Write (only after the user turns a type on, and only if Apple Health allows it for that type):

| Source in Vital Plus | HealthKit identifier | Record ID | Sample |
|---|---|---|---|
| Meal (`meals[]`, kcal ≥ 1) | `DietaryEnergyConsumed` | `meal.<mealId>` | at the meal's time; removed meal → own sample deleted |
| Water log (`waterLog[day]`, litres) | `DietaryWater` (mL) | `water.<day>` | one daily total, midnight → now/end of day; reset to 0 → own sample deleted |
| Weight log (`weightLog[day]`) | `BodyMass` (kg) | `weight.<day>` | at first export time (today) or 12:00; later changes replace it; never deleted |
| — | `ActiveEnergyBurned` | — | **interface only, disabled** (`ACTIVE_ENERGY_EXPORT_ENABLED = false`): Vital Plus has no first-party workout record, and active energy is never derived from meals |

Never written: basal energy, heart rate, steps, sleep, anything imported. Exports cover entries from
the day the switch was turned on and at most the last 7 days. Samples are marked
`HKMetadataKeyWasUserEntered`. Partial write permission: each type's status is checked before
writing; a blocked type is skipped and the UI shows where to allow it.

## Data isolation guarantees

- Imported values exist only in `AppleHealthController` state and the native per-account file.
- They are not written to `useStore()`, `localStorage` (`fv-health-v1`), Supabase, server functions,
  AI endpoints, analytics or any third party. Tests enforce this (store/upsert/localStorage are
  checked after a sync; the Apple Health modules contain no Supabase, server-function, `fetch` or
  logging calls).
- **Account switch / sign-out:** in-memory data is dropped immediately, in-flight syncs and exports
  are discarded, and only the new account's file is loaded. A different account gets its own file
  and its own one-time intro.
- **Important limitation:** HealthKit permission belongs to the **iPhone**, not to the Vital Plus
  account. If a second account on the same iPhone connects, it reads the same Apple Health data.
  The UI states that access applies to this iPhone.
- **Disconnect** (*Trennen und lokale Daten löschen*): stops reading and writing, deletes the cached
  summary, export switches and ledger, keeps only the intro choice. Samples already written stay in
  Apple Health (they belong to the user there). Revoking permission is done in *Einstellungen ›
  Datenschutz & Sicherheit › Health › Vital Plus*, which the UI explains.
- No health values are logged (native or JS). Plugin errors carry codes only.

## Onboarding and UI

- **One-time intro** (*Apple Health verbinden?* → *Apple Health verbinden* / *Jetzt nicht*) appears
  on signed-in app pages (tab bar visible) once the questionnaire is done, for new **and** existing
  users (no saved choice yet). Closing it counts as *Jetzt nicht*; it is never shown again for that
  account on that iPhone. No permission prompt at launch — only after the tap.
- **Profil › Gesundheitsprofil bearbeiten** (`/profil/personal`): status, connect, *Jetzt
  synchronisieren* (becomes *Synchronisierung abbrechen* while running, *Erneut versuchen* after an
  error), last successful sync, today's imported values, export switches (active energy shown as
  unavailable), data explanation, permission guidance, disconnect with confirmation.
- On the web the section says Apple Health is available in the iPhone app; on devices without
  HealthKit it says it is not available.
- Accessibility: labelled switches, `role="status"`/`aria-live` for sync state, `role="alert"` for
  errors, the spinner only animates with `motion-safe`. Safe areas come from the existing shell
  and dialogs. The app is currently light-only (project rule); the UI uses only semantic tokens, so
  it follows a future dark theme.

## Privacy manifest review

No change needed to `PrivacyInfo.xcprivacy`:
- No new required-reason API (file writes do not read timestamps or disk space).
- Imported HealthKit data does not leave the device, so it is not "collected". Data entered in the
  app is already declared (Health, Fitness).

## Tests

| Command | Result |
|---|---|
| `bun install --frozen-lockfile` | OK, no changes |
| `bunx tsc --noEmit` | 0 errors |
| `bun run test -- --run` on Node 22 (CI version) | **36 files, 229 tests passed** (42 new) |
| `bun run test -- --run` on local Node 25 | 225 passed, 4 failed: the 3 known `store-auth` tests and the new store-privacy test, all from Node 25's built-in `localStorage` breaking jsdom (`localStorage.clear is not a function`). CI uses Node 22. |
| `bun run build` | OK (same 4 warnings as before) |
| `bun run ios:sync` | OK (plugins: app, haptics, status-bar; the Health plugin is part of the App target) |
| ESLint, new files | 0 errors; 1 `react-refresh/only-export-components` warning (same pattern as `AppShell.tsx`) |
| Xcode build | **Not run locally** (no Xcode). The *iOS build (Simulator, unsigned)* workflow compiles it on push. |

New tests cover: unsupported devices (web, no HealthKit), first-run intro, skip and reconnect,
account switching and sign-out, read/write authorization, partial permissions, missing samples,
unit conversion, sync cancellation and retry, duplicate-write prevention, delete of own samples,
device-only isolation (store, localStorage, Supabase upsert), disconnect and cache clearing, no
cloud/AI/network/logging code in the Apple Health modules, native configuration (entitlement,
usage strings, plugin registration, bundle ID unchanged, no logging), translations, and that the
meal/voice workflow files do not depend on Apple Health (their existing tests still pass).

## CI

The existing Simulator workflow compiles `VitalHealthPlugin.swift` (HealthKit is part of the iOS
Simulator SDK), so it validates compilation. It builds with signing disabled, so it cannot validate
the entitlement against a provisioning profile. Proposed, narrowly scoped (needs your approval
because it touches the release workflow): in `ios-release.yml`'s profile check, fail early with a
clear message when `App.entitlements` requests HealthKit but the profile's entitlements do not
contain `com.apple.developer.healthkit`.

## Known limitations

- Native code is unverified until CI compiles it and it runs on an iPhone.
- Imported values are shown only in the profile section. *Heute*, *Gesundheit* and the *Bewegung*
  dialog still show the app's own entries (the dialog text still says Apple Health is not connected).
- Sync runs on connect and on *Jetzt synchronisieren* only (no automatic sync on app start or in
  the background).
- Heart rate: only the daily average is displayed (min/max are read). Sleep stages are not shown
  separately.
- Usage descriptions are German only (no `InfoPlist.strings` for en/es yet).
- Deleting the Vital Plus account does not delete that account's local Apple Health file on the
  iPhone (it is unreadable by other accounts and removed on disconnect or app deletion).
- **Privacy policy not updated** (needs approval): it must describe HealthKit reading, on-device
  storage, optional writing, and that Health data is not used for advertising or AI. App Review
  requires this for HealthKit apps.

## Physical iPhone verification checklist

Debug build from Xcode with automatic signing (*Signing & Capabilities* must show HealthKit):

1. Fresh install, sign in, finish the questionnaire → the intro appears once; no system prompt yet.
2. *Jetzt nicht* → relaunch → no intro. Profile section shows *Nicht verbunden*.
3. *Apple Health verbinden* → the Health sheet lists 8 read and 3 write types with the German texts.
4. Allow all → *Heute aus Apple Health* shows today's steps, heart rate, sleep, energies, water,
   weight; compare with the Health app (same day, Watch + iPhone not double-counted).
5. Turn on *Wasser*, add water in Ernährung → after ~2 s a Vital Plus water sample appears in Health
   (Health › Durchsuchen › Ernährung › Wasser › Alle Daten anzeigen). Change it → still one sample.
6. Turn on *Nahrungsenergie*, save a voice meal (Phase 2B flow) and a photo/manual meal → one sample
   each; delete a meal → its sample disappears. Voice entry still works unchanged.
7. Turn on *Gewicht*, change weight twice today → one sample with the latest value.
8. Data that Vital Plus wrote is not listed as imported (water total in *Heute aus Apple Health*
   excludes it).
9. In Settings › Health › Vital Plus turn off *Wasser* write → the switch shows the warning; nothing
   is written. Turn off all reads → values show *Keine Daten*, not 0.
10. Start a sync and tap *Synchronisierung abbrechen* → no change; airplane mode is irrelevant
    (HealthKit is local). Lock the iPhone during sync → error, then *Erneut versuchen* works.
11. Sign out, sign in with a second account → no data from the first account; its own intro appears.
12. *Trennen* → confirm → values gone; reconnecting needs no new system prompt.
13. Delete and reinstall → intro appears again; nothing restored from backup.
14. Camera, microphone (voice meal), Keychain session (stay signed in after relaunch) and deep links
    (`vivohealth://heute`) still work.
15. Safari Web Inspector: no health values in the console.

## Apple Developer portal steps (need approval)

1. Certificates, IDs & Profiles › Identifiers › `com.fairvital.vivohealth` › enable **HealthKit**.
   Do **not** enable Clinical Health Records or background delivery. Save.
2. Profiles › the App Store profile for this App ID becomes invalid → Edit › Save/Generate ›
   download. Distribution certificate and Team `R9RKNU986H` stay the same.
3. Update the GitHub secret `IOS_APPSTORE_PROFILE_BASE64` with the new profile (base64).
4. Development: Xcode automatic signing adds HealthKit to the development profile once the App ID
   has it. If you use a personal team instead, confirm that Xcode offers HealthKit for it.

## Remaining signing requirements

- Until steps 1–3 are done, `ios-release.yml` archives will fail with a missing HealthKit
  entitlement. Do not run the TestFlight upload from a commit containing this phase before then.
- The release workflows run from `feature/ios-capacitor` / `feature/ios-testflight-upload`; this
  phase is only on `feature/ios-native-enhancements`.

## Recommended next steps before TestFlight

1. Check the CI Simulator build for this commit; fix any Swift compile issue.
2. Run the iPhone checklist above.
3. Approve and apply the portal and profile steps; then optionally the CI profile check above.
4. Approve privacy-policy wording for HealthKit; update the App Privacy answers and the App Review
   notes (what Health data is read, that it stays on the device, what is written and when).
5. Optional: show imported steps/energy in *Bewegung*/*Gesundheit*, sync on app foreground,
   `InfoPlist.strings` for en/es, clear the local Apple Health file during account deletion.

## Continue on macOS

```bash
git fetch origin
git checkout feature/ios-native-enhancements
git pull --ff-only origin feature/ios-native-enhancements
bun install --frozen-lockfile
bunx tsc --noEmit && bun run test -- --run   # use Node 22
bun run ios:sync
bun run ios:open   # Signing & Capabilities: check HealthKit, then run on a physical iPhone
```
