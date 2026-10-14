# App Store readiness — Vivo Health (iOS)

Status: **not ready for submission.** The unsigned Simulator build is the first milestone only. Items below are marked:

- ✅ done
- 🟡 partly done / needs verification
- ⬜ open
- ⛔ blocked (needs an external decision or account)

## 1. Apple Developer and App Store Connect

| Item | Status | Notes |
|---|---|---|
| Apple Developer Program membership | ✅ | Team ID `R9RKNU986H`, set as `DEVELOPMENT_TEAM` in the Xcode project. |
| Final bundle ID | ✅ | `com.fairvital.vivohealth` in `capacitor.config.ts` and Xcode `PRODUCT_BUNDLE_IDENTIFIER` (Debug and Release). The release workflow fails if they differ. |
| App ID + capabilities | ⛔ | **HealthKit** is now required (Phase 2C, `ios/App/App/App.entitlements`). Enable it on the App ID and **regenerate the App Store profile** before the next signed build; until then the archive fails. Steps: [PHASE-2C-APPLE-HEALTH-HANDOFF.md](PHASE-2C-APPLE-HEALTH-HANDOFF.md#apple-developer-portal-steps-need-approval).<br>Recommended later: Data Protection (`NSFileProtectionComplete`), also a profile change.<br>Later, for universal links: Associated Domains.<br>Not needed: Push, Clinical Health Records, HealthKit background delivery, Sign in with Apple. |
| Apple Distribution certificate | 🟡 | Created; reported as stored in secrets `IOS_DIST_CERT_P12_BASE64` and `IOS_DIST_CERT_PASSWORD`. Verified by the first workflow run. |
| App Store provisioning profile | 🟡 | Created; reported as stored in secret `IOS_APPSTORE_PROFILE_BASE64`. The workflow checks type, App ID, expiry and certificate before archiving. |
| App Store Connect API key (App Manager role) | 🟡 | Reported as stored in secrets `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8_BASE64`. Only used when `upload` is checked. |
| App record in App Store Connect | ✅ | Exists (reported). |

## 2. Store listing

| Item | Status | Notes |
|---|---|---|
| App name | 🟡 | "Vivo Health" was requested, but the in-app logo, page titles and PWA say **"Vitalplus" / "Vital Plus"**. Decide one name; guideline 2.3.7 and user confusion apply. |
| Subtitle, description, keywords | ⬜ | Avoid diagnostic or treatment claims (see §3). |
| Category | ⬜ | Suggested: Health & Fitness (primary), Food & Drink (secondary). |
| Support URL | ⬜ | Public page with a contact option (e.g. service@fairvital.com). |
| Privacy Policy URL | ⬜ | Must be public. The current policy exists only inside the app and needs the updates listed in `privacy-checklist.md`. |
| Screenshots | ⬜ | 6.9" iPhone required. The app is iPhone-only (`TARGETED_DEVICE_FAMILY = 1`), so no iPad screenshots are needed. |
| App icon | 🟡 | `AppIcon-512@2x.png` (1024 px, opaque) is **upscaled from a 512 px source**. Provide a 1024 px master from the brand team. |
| Launch screen | 🟡 | White screen with the logo. Replace with the final artwork. |
| Age rating questionnaire | ⬜ | Medical/treatment information: "infrequent/mild" is likely. To be answered by the product owner. |
| App Privacy questionnaire | 🟡 | Draft in `privacy-checklist.md`. |
| Export compliance | ✅ | `ITSAppUsesNonExemptEncryption = NO` (HTTPS only). |
| Privacy manifest (`PrivacyInfo.xcprivacy`) | ✅ | In the App target's resources. Declares UserDefaults (`CA92.1`), no tracking, and the collected data types from `privacy-checklist.md`. Capacitor 8.5.3 and Cordova ship their own (empty) manifests. |

## 3. App Review Guidelines assessment

| Guideline | Status | Assessment |
|---|---|---|
| **4.2 Minimum functionality** | 🟡 | The UI is bundled (no remote website wrapper). There are native touches: Keychain sessions, status bar, deep links, camera/microphone, offline notice. App Review may still judge it "web-like"; adding native value (e.g. Face ID lock, local reminders) would strengthen the submission. |
| **5.1.1(v) Account deletion** | ⛔ | The flow exists in the app (Profil → Meine Daten), but on iOS it calls a server function that is blocked until the `src/start.ts` change is **published**. **Must work before submission.** |
| **5.1.1 Data collection / privacy** | 🟡 | Permissions are limited to camera and microphone with purpose strings. The privacy policy needs corrections (voice transcription, iOS specifics). |
| **5.1.2 Data use and sharing** | 🟡 | Health data must not be used for advertising, and isn't. Disclose the AI provider. |
| **5.1.3 Health and health research** | 🟡 | No HealthKit. Lab values are entered or uploaded by the user. Make sure no data is shared with third parties beyond the disclosed AI processing. |
| **1.4.1 Physical harm (medical)** | 🟡 | AI lab analysis and supplement suggestions are sensitive. The app already says results are estimates and not medical advice. Keep a visible disclaimer in the listing and on lab and plan screens. Do not claim diagnosis, treatment, or measurement accuracy. Expect reviewer questions. |
| **3.1.1 / 3.1.3 Purchases** | ✅ | Physical goods (supplements) are sold on fairvital.com and open in Safari. Physical goods are exempt from in-app purchase. No digital content is sold. |
| **Third-party AI (5.1.2(i), 2023+ guidance)** | 🟡 | Disclose in the privacy policy (and ideally in the app) that content is sent to a third-party AI provider. Consider an explicit consent step before the first upload. |
| **2.1 App completeness** | ⛔ | The AI features don't work on iOS until the server change is published. Reviewers need a demo account with representative data. |
| **4.0 Design / iPhone UX** | 🟡 | Safe areas, portrait-only and the status bar are handled in code but **not yet seen on a device or Simulator**. |
| **Sign in with Apple (4.8)** | ✅ | Not required: email/password only, no third-party social login in the app. |

## 4. Engineering items before the first TestFlight build

1. **Publish the server change.** Bring `src/start.ts` into Lovable's branch (`vital-plus`) and publish, so production allows `capacitor://localhost`. That is a production deployment and needs explicit approval. Then verify AI, password reset and account deletion on iOS.
2. **Run on the Simulator** (Mac with Xcode 26, or download the CI artifact; see README) and walk the test plan in `README.md`.
3. ✅ **Bundle ID and team** are set; Release uses manual Apple Distribution signing.
4. ✅ **Privacy manifest** is in the App target.
5. **Replace the icon and launch artwork** with final assets.
6. **Prepare TestFlight review details:** a demo account and review notes. The notes should explain:
   - the AI features
   - that purchases happen on fairvital.com (physical goods)
   - the medical disclaimer
7. **Configure release CI:**
   - the secrets listed in §1 (bundle ID and team are now in the repository; the `IOS_BUNDLE_ID` and `APPLE_TEAM_ID` variables are no longer read)
   - a GitHub environment `ios-release` with required reviewers
   - repository variable `IOS_RELEASE_ENABLED=true`
   - ✅ signing test: build 1 was signed, exported and validated with `upload` off
   - first TestFlight upload: push the reviewed commit to `feature/ios-testflight-upload` and approve the `ios-release` deployment (README → GitHub Actions). The build number is taken from App Store Connect (≥ 2).
