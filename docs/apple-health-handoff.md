# Apple Health UI handoff

## Access and branch boundaries

The public GitHub repository `bitsnframes91/vital-plus` and both `feature/ios-native-enhancements` and `integration/apple-health-into-vital-plus` were readable on 20 October 2026. Only the Lovable working checkout was changed. No mobile branch, Swift file, Capacitor configuration, signing, workflow, microphone code, CORS or authentication implementation was changed. No production deployment or TestFlight build was triggered.

## Shared contracts

Reused the developer's existing files, not a separate HealthKit implementation:

- `src/lib/native-app.ts`
- `src/lib/apple-health/bridge.ts`
- `src/lib/apple-health/summary.ts`
- `src/lib/apple-health/sync.ts`
- `src/lib/apple-health/device-state.ts`
- `src/lib/apple-health/export-plan.ts` (dependency of the existing provider)
- `src/components/AppleHealth.tsx`

The bridge still registers `VitalHealth`, gated by `VITE_NATIVE_APP`. The existing provider owns authorization, synchronization and protected per-account native files. Its imported measurements never enter the cloud-synced store. The profile summary was removed from `AppleHealthSection`; connection and optional export controls now render from Gesundheit. The existing section export remains available for mobile compatibility; do not retain a second placement under the profile editor.

Added `@capacitor/core` for the shared bridge import. Keep the mobile branch's existing compatible Capacitor dependency version when synchronizing.

## Screen consumption

- `src/lib/apple-health/readings.ts` selects measurements without persistence.
- `src/components/AppleHealthReadings.ts` exposes that selection from the existing provider and checks local date rollover.
- `src/routes/__root.tsx` mounts one `AppleHealthProvider` inside the store/settings providers. Do not mount a second mobile provider.
- `src/routes/gesundheit.tsx` displays today's steps and sleep, active energy under Bewegung, average heart rate, and the latest dated weight. Manual inputs remain separate; Apple Health never overwrites profile weight or BMI inputs.
- `src/components/TodayWellnessGoals.tsx` prefers available measured steps/sleep independently, falls back to today's manual values, and labels each source. Targets remain 10,000 steps and 8 hours. A measured zero is retained; missing data is not zero.
- `src/routes/trends.tsx` displays available daily steps, sleep, active energy and average heart rate, without filling missing days or inventing readings. Distance and pace remain unavailable. Weight is a latest measurement, not a fabricated daily series.
- `src/lib/apple-health-translations.json` provides German-source English/Spanish strings and is loaded by `src/lib/language.ts`.

## Controlled mobile synchronization

1. Selectively consume the changed React files and shared TypeScript modules into the mobile branch using the developer's controlled synchronization process; do not merge the whole mobile branch into Lovable.
2. Retain the existing native plugin, native build configuration, signing and workflows.
3. Ensure the native build still defines `VITE_NATIVE_APP=true`, mounts exactly one provider, and removes the old `AppleHealthSection` placement in the profile editor.
4. Build and synchronize the native web assets using the mobile project's existing process; the developer then produces the next iOS build.
5. On a physical iPhone, connect and synchronize, compare each available value against Apple Health, navigate Gesundheit → Heute → Trends, verify manual values remain unchanged, then verify disconnect/sign-out removes measured data from screen state.

## Verification and limitations

- 26 focused tests passed across Apple Health selection/provider/Heute integration, wellness progress, step thresholds and localization.
- Signed-in browser navigation to Gesundheit, Heute and Trends was exercised; the browser-only Apple Health fallback rendered, no page errors or horizontal overflow appeared on desktop or the checked phone viewport.
- The tested account displayed an existing email-confirmation notice; no account settings or data were modified.
- Preview compilation reported `build OK`.
- Physical iPhone HealthKit reads and TestFlight behavior cannot be verified in this browser. UI counters were verified with the actual provider using a simulated bridge; this is not a physical-device end-to-end test.
- The existing synchronization imports seven daily summaries. No hourly queries or background synchronization was added.

## Native extension: distance and speed (mobile branch, after the Lovable UI sync)

`DaySummary` gained `distanceKm`, `walkingSpeedKmh` and `runningSpeedKmh` (optional numbers; missing = no data), and `healthReadings()` / `useHealthReadings()` return today's `distanceKm`, `walkingSpeedKmh` and `runningSpeedKmh` as `number | null` (never a manual value or 0). Speeds are averages of HealthKit speed samples. `runningSpeed` needs iOS 16; on iOS 15 it stays `null` and appears in `summary.unsupportedTypes`. Connected accounts are asked for the new read types once, on their next "Jetzt synchronisieren". Files changed: `bridge.ts`, `summary.ts`, `readings.ts`, `AppleHealth.tsx` (sync permission check and intro text), `apple-health-translations.json`, `VitalHealthPlugin.swift`, `Info.plist`.
- Missing measurements can also reflect unavailable read access; HealthKit does not reveal read authorization status. Existing per-type read failures remain in `failedTypes`.
- Existing optional export behavior was retained. An already-issued native operation cannot be canceled by the React layer; native cancellation guarantees are not asserted.