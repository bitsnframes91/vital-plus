# iOS privacy checklist

> **Update, 30 October 2026:** HealthKit (Apple Health) is now integrated with readings kept on the device, and AI features need a separate consent (see [app-store-submission.md](app-store-submission.md) §3 and §7). The privacy-policy items below (voice transcription, iOS specifics, public URL) are fixed in `src/lib/privacy-policy.ts` and the public `/datenschutz` page. Sections below that say "no HealthKit" are out of date.

This is an engineering review of how the iOS build handles personal health data. **It is not a legal assessment.** GDPR and App Store compliance have not been confirmed and still need review by the data-protection officer / legal team.

Legend: ✅ implemented and verified · 🟡 implemented, needs device test · ⬜ open

## Data the app processes

| Data | Where it lives | Leaves the device to |
|---|---|---|
| Account (email, auth session) | Supabase Auth; on iOS the session is in the **Keychain** | Supabase (Lovable Cloud) |
| Profile, body measurements, weight log, meals, supplement plan, lab values, goals | `user_data` row (one JSON per user, RLS); local cache in WKWebView `localStorage` (`fv-health-v1`) | Supabase |
| Lab PDFs/photos, food photos, voice recordings | In memory only, sent for analysis | Hosted server → Lovable AI Gateway (`ai.gateway.lovable.dev`) |
| Logged meals as context for lab plans | Bounded excerpt per request | Lovable AI Gateway |
| Settings (language, theme, reminders) | `localStorage` | — |

The iOS work adds **no new recipients**:

- no analytics, tracking, advertising or crash-reporting SDKs
- no Firebase
- no HealthKit

## Checklist

### Storage and sessions
- ✅ **Auth tokens stay out of plaintext storage.** On iOS, Supabase sessions are stored in the Keychain with `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`:
  - not included in backups
  - not migrated to other devices
  - see `SecureSessionStoragePlugin.swift`
- ✅ **No session survives a reinstall.** Keychain items outlive app deletion, so the plugin clears them on the first launch of a new installation.
- ✅ **Tokens and health data are not logged** by the new code. Errors log fixed messages only.
- 🟡 **The health-data cache is stored unencrypted.** `fv-health-v1` sits in WKWebView `localStorage`, which is a plaintext file in the app sandbox. It is protected by iOS sandboxing and Data Protection, but it is included in device backups.
  - **Recommendation:** once the App ID exists, enable the Data Protection capability with `NSFileProtectionComplete`.
  - **Recommendation:** decide whether the cache should be excluded from backups. That would require a native change, because the store uses synchronous `localStorage`.
- ✅ **Previous-user data is cleared on sign-out.** The existing flow in `src/lib/store.tsx` does this, and the shared code is unchanged. Covered by `src/test/store-auth.test.tsx` (passes on Node 22).
- ⬜ **Offline launch with a cached account clears the local cache.** If the app starts offline, `supabase.auth.getUser()` fails and the store treats the user as signed out.
  - This favors privacy over availability, and the web app behaves the same.
  - To verify on a device: what users see, and whether data reloads when back online.

### Permissions
- ✅ **Only permissions used by existing features are requested:**
  - `NSCameraUsageDescription`: food photo and lab photo (`<input capture>`)
  - `NSMicrophoneUsageDescription`: voice meal logging (`getUserMedia`)
- ✅ **No photo-library permission.** WKWebView file inputs use the system picker (PHPicker), which needs no permission. Re-check on a device that no prompt appears.
- 🟡 **Microphone capture in WKWebView** under the `capacitor://` scheme needs a device test. If it fails, voice input shows the existing error state.
- ✅ **No location, contacts, tracking (ATT), HealthKit or push permissions.**

### Feature-specific
- ✅ **No App Lock or system notifications.** The current web app removed both (light-only settings with in-app reminders only), so the iOS app offers neither. In-app reminders appear while the app is open; no background delivery is claimed.
- ✅ **Shopware links open in Safari.** Cart and checkout stay on fairvital.com, and no data is passed to the shop.
- 🟡 **Account deletion** reuses the verified server flow (`deleteAccount`). On iOS it works **only after** production allows `capacitor://localhost` via CORS (Lovable; see architecture.md). Until then it fails safely with an error.
- 🟡 **Password reset** now runs through the `requestPasswordReset` server function. Like account deletion, it works on iOS **only after** production allows `capacitor://localhost` via CORS (Lovable). Until then it fails safely with an error.

### Third parties already used by the web app (unchanged; included in App Privacy answers)
- **Supabase / Lovable Cloud:** auth and the data store.
- **Lovable AI Gateway:** uploaded lab, photo and voice content.
- **Lovable CDN:** mascot, logo and product images, served via `vital-plus.lovable.app`.
- **Google Fonts:** `fonts.googleapis.com` / `fonts.gstatic.com` are loaded at startup, which sends the user's IP address to Google.
  - German courts have found this problematic without consent (LG München I, 3 O 17493/20).
  - **Recommendation:** self-host the font. That is a separate change affecting web and iOS.

### Privacy policy (src/lib/privacy-policy.ts) — needs legal update, not changed here
- ⬜ **§4 is inaccurate about voice input.** It says voice input uses the browser/OS speech recognition, but `mealFromVoice` uploads the recording to the Lovable AI Gateway for transcription.
- ⬜ **§6 doesn't describe the iOS app.** It refers to browser-shown reminders and notifications. Add the iOS specifics: Keychain session, camera and microphone use.
- ⬜ **The policy is only in the app.** App Store Connect needs a public Privacy Policy URL.

## App Store "App Privacy" draft answers (to be confirmed by legal)

| Apple category | Collected | Linked to user | Tracking | Purpose |
|---|---|---|---|---|
| Contact info: name | Yes (profile name, synced to the account) | Yes | No | App functionality |
| Contact info: email address | Yes | Yes | No | App functionality (account) |
| Health & fitness: health, fitness | Yes | Yes | No | App functionality |
| User content: photos, audio data | Yes (sent for analysis, not stored by us — verify the AI provider's retention) | Yes | No | App functionality |
| Identifiers: user ID | Yes | Yes | No | App functionality |
| Diagnostics, usage data, location, purchases | No | — | — | — |

`ios/App/App/PrivacyInfo.xcprivacy` declares these collected data types (linked to the user, not used for tracking, purpose App Functionality) and `NSPrivacyAccessedAPICategoryUserDefaults` with reason `CA92.1`, because `SecureSessionStoragePlugin` uses `UserDefaults`. Keep it in sync with this table and with the App Store Connect answers. Capacitor 8.5.3 and Cordova ship their own manifests; their binaries import no required-reason APIs. `@capacitor/app` and `@capacitor/status-bar` use none either.
