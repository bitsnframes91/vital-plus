# App Store readiness — Vivo Health (iOS)

Status: **not ready for submission.** The unsigned Simulator build is the first milestone only. Items below are marked:

- ✅ done
- 🟡 partly done / needs verification
- ⬜ open
- ⛔ blocked (needs an external decision or account)

## 1. Apple Developer and App Store Connect

| Item | Status | Notes |
|---|---|---|
| Apple Developer Program membership | ⛔ | Organization enrollment (D-U-N-S number) for Fairvital / the publisher. Determines the Team ID. |
| Final bundle ID | ⛔ | Placeholder `com.example.vitalplus`. Change in **two** places:<br>• `capacitor.config.ts` (`CAPACITOR_APP_ID`)<br>• Xcode `PRODUCT_BUNDLE_IDENTIFIER`<br>The release workflow overrides it from the `IOS_BUNDLE_ID` variable. |
| App ID + capabilities | ⬜ | Needed: Data Protection (`NSFileProtectionComplete`, recommended).<br>Later, for universal links: Associated Domains.<br>Not needed: Push, HealthKit, Sign in with Apple (no third-party login is offered in the app). |
| Apple Distribution certificate | ⛔ | Export as `.p12` → secret `IOS_DIST_CERT_P12_BASE64` and `IOS_DIST_CERT_PASSWORD`. |
| App Store provisioning profile | ⛔ | → secret `IOS_APPSTORE_PROFILE_BASE64` |
| App Store Connect API key (App Manager role) | ⛔ | → secrets `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8_BASE64` |
| App record in App Store Connect | ⛔ | Name, primary language (German), bundle ID, SKU |

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
| Privacy manifest (`PrivacyInfo.xcprivacy`) | ⬜ | Must declare UserDefaults (`CA92.1`). |

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

1. **Publish the server change.** Merge to `main` and publish in Lovable so production allows `capacitor://localhost` (`src/start.ts`). That is a production deployment and needs explicit approval. Then verify AI and account deletion on iOS.
2. **Run on the Simulator** (Mac with Xcode 26, or download the CI artifact; see README) and walk the test plan in `README.md`.
3. **Fix the bundle ID and team.** Set the final bundle ID and Team ID; enable automatic or manual signing.
4. **Add the privacy manifest.** Add `PrivacyInfo.xcprivacy` to the App target.
5. **Replace the icon and launch artwork** with final assets.
6. **Prepare TestFlight review details:** a demo account and review notes. The notes should explain:
   - the AI features
   - that purchases happen on fairvital.com (physical goods)
   - the medical disclaimer
7. **Configure release CI:**
   - repository variables `IOS_RELEASE_ENABLED=true`, `IOS_BUNDLE_ID`, `APPLE_TEAM_ID`
   - the secrets listed in §1
   - a GitHub environment `ios-release` with required reviewers
   - then run *iOS release (TestFlight)* manually.
