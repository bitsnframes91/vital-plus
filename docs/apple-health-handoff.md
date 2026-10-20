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
- `src/routes/trends.tsx` displays the seven-day import of available daily steps, sleep, active energy, average heart rate, distance and walking/running speed, without inventing readings. Weight is a latest measurement, not a fabricated daily series.
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
- The existing synchronization imports seven daily summaries. No hourly queries or background synchronization was added; speed is shown in km/h, not converted to pace.
- Missing measurements can also reflect unavailable read access; HealthKit does not reveal read authorization status. Existing per-type read failures remain in `failedTypes`.
- Existing optional export behavior was retained. An already-issued native operation cannot be canceled by the React layer; native cancellation guarantees are not asserted.

## Distance and speed completion — 20 October 2026

Reference native commit: `2ff6253` on `feature/ios-native-enhancements`.
Completed React/contract code revision (includes passing typecheck fix): `b8b1dabf6c56b83578304e3f2b41fe1acdf91dac`. Documentation updates follow this revision; no manual commit or branch merge was performed.

Exact files modified for this completion:

- `src/lib/apple-health/bridge.ts`
- `src/lib/apple-health/summary.ts`
- `src/lib/apple-health/readings.ts`
- `src/components/AppleHealth.tsx`
- `src/routes/gesundheit.tsx`
- `src/routes/trends.tsx`
- `src/lib/apple-health-translations.json`
- `src/test/apple-health-distance.test.tsx`
- `AGENTS.md`
- `roadmap.md`
- `docs/apple-health-handoff.md`

The first eight files are the runtime/test synchronization set. No change is needed to `sync.ts`, `device-state.ts`, `export-plan.ts` or `AppleHealthReadings.ts`: they consume the updated shared contract automatically. Retain Vitalplus spelling and current Gesundheit placement instead of copying the reference provider's branding changes.

The optional `getRequestStatus` check runs before a user-initiated synchronization. `shouldRequest` requests the current read/export types; failures or older native builds continue with existing permissions. This status does not prove read authorization. The verified normalizer accepts daily distance sums and average speed samples, preserves unsupported types and missing values, and stores only through the existing device-local provider.

Gesundheit shows distance with 1–2 decimals in km and speeds with 1 decimal in km/h, with Apple Health labels for supplied measurements. Trends includes these three metrics in the existing daily history; absent entries show `–/–`. Running speed requires iOS 16 and compatible recordings. Manual entries never substitute for these metrics.

Verification: 37 focused tests passed, including unit conversion, missing/zero measurements, historical fields, unsupported running speed, seven-day queries and additional-permission ordering through the actual provider. The harness reported `build OK` after correcting the test type error. Signed-in browser navigation Gesundheit → Trends → Gesundheit passed without page errors; browser placeholders and updated units were visually checked. A separate browser attempt to inject simulated native readings did not render successfully, so measured screen rendering and physical iPhone/TestFlight comparisons remain unverified. The developer must selectively synchronize these changes, create the next TestFlight build, approve newly requested readings and compare both screens against Apple Health on a physical iPhone. No backend, CORS, authentication, Swift, signing, workflow, mobile branch or TestFlight changes were made.