# App Store readiness — FairVital Go (30 October 2026)

This report lists what still stands between the renamed app and a public App Store submission after the
fairvitalgo rebrand (Lovable `7bf8e6e`) was integrated into the iOS branch. It covers open questions only.
Nothing has been submitted to App Review. The earlier package in [app-store-submission.md](app-store-submission.md)
still applies, except that its metadata uses the old name "Vital Plus".

**This is not a legal assessment.** Items marked as legal questions need the product owner or legal counsel.
No legal wording was changed in the app to answer them.

## 1. Legal and privacy-policy accuracy (owner / legal decision)

The privacy policy, terms and the "Datenschutzstandards" block are the brand owner's texts from Lovable
(changelog CHG-11, CHG-14 to CHG-17). They are integrated verbatim. Compared with what the code does:

| # | Statement in the owner's text | What the code does | Where |
|---|---|---|---|
| L1 | AI processing happens on approved systems in Germany, "über das Lovable AI Gateway mit Verarbeitung in Deutschland" (§4.1). | AI server functions call `https://ai.gateway.lovable.dev` with the models `openai/gpt-6-astra` (lab reports, meal text, food photos, lab plans) and `google/gemini-3.5-transcribe` (voice). Where the gateway and those providers process data has not been confirmed in writing. | `src/lib/ai.functions.ts`, `src/lib/food-photo/*` |
| L2 | Health data is stored and processed only in Germany; no transfer abroad (opening promise, §5.1, Datenschutzstandards). | Database and auth are stated as AWS eu-central-1, but AI requests (L1) and Cloudflare edge delivery ("global/EU", §5) may leave Germany. | `src/lib/privacy-policy.ts`, `src/lib/privacy-standards.ts` |
| L3 | Voice input may use the browser's or operating system's speech recognition (§4.4). | Voice recordings are uploaded and transcribed on the server by the Google model in L1. The device's speech recognition is not used. | `src/lib/ai.functions.ts` (`mealFromVoice`) |
| L4 | The in-app AI consent dialog (iOS work) says content goes via Lovable to OpenAI and Google and may be processed outside the EU, including the USA. | This contradicts L1/L2. Both appear on Profil → Meine Daten. | `src/components/AiConsent.tsx` |
| L5 | Terms §1: "Die verbindlichen Angaben zum Vertragspartner … sind vor Veröffentlichung dieser Bedingungen zu bestätigen und zu ergänzen." | Unfinished placeholder in all three languages. | `src/lib/terms.ts` |
| L6 | Privacy policy has no date (CHG-18 removed it). | A "last updated" date is common practice and helps users see which version they agreed to. | `src/lib/privacy-policy.ts` |
| L7 | Privacy policy §4 does not mention that recent meals (up to 100) are sent with lab requests and manual lab plans. | `mealPlanContext` adds meal names and macros to lab prompts. | `src/lib/ai.functions.ts` |

Two tests encode the expected outcome and are skipped until the texts are settled:
`src/test/ai-consent.test.tsx` → "legal texts". Once the owner decides, either the texts or the AI notice (L4)
must change so that both say the same thing.

Apple relevance: Guideline 5.1.1(i) and 5.1.2(i) require the privacy policy to identify third parties that
receive personal data, including third-party AI. App Privacy answers in App Store Connect must match.

## 2. Release-blocking items outside the code

| # | Item | Status |
|---|---|---|
| R1 | App Store Connect app record is still named "Vivo Health". Rename it to "FairVital Go" (DE and EN) and confirm the name is available. Do not create a new app. | Open (App Store Connect) |
| R2 | Public Privacy Policy and Support URLs: `/datenschutz`, `/support`, `/impressum` and `/nutzungsbedingungen` exist only on the iOS branch. On `https://fairvitalgo.lovable.app` they return 404 until the branch is synced to Lovable (`vital-plus`) and published. | Open (Lovable sync + publish) |
| R3 | Server-side AI consent check (`enforceAiQuota` → `hasAiConsent`) is on the iOS branch only; the live server does not enforce it yet. The iOS client asks before every AI call. | Open (Lovable sync + publish) |
| R4 | Metadata in app-store-submission.md §4 (name, subtitle, description, keywords, review notes) still says "Vital Plus". | Open (rewrite with the new name) |
| R5 | Screenshots: `fairvitalgo_AppStore_Screenshots.zip` contains 8 iPhone (1290×2796, accepted for the 6.9" slot) and 8 iPad (2048×2732, 13") images. They were produced from the web app; check that they match the iOS build (no browser chrome, AI consent dialog, Apple Health section). | Review |
| R6 | App icon artwork has rounded corners drawn in. iOS applies its own mask, so a faint edge can show at the corners. Apple asks for a square, full-bleed image. | Designer check |
| R7 | Impressum still links the EU online dispute resolution platform, which closed in 2025 (text is verbatim from fairvital.com). | Owner |
| R8 | Supabase auth redirect allow-list must include `https://fairvitalgo.lovable.app/**` so sign-up and reset emails open the app's pages. Route targets return 200; delivery of a real email has not been tested from iOS. | Verify on device |

## 3. Done in this integration

- Host switched to `https://fairvitalgo.lovable.app` (approved). All 8 server functions in the iOS bundle
  resolve on the live host with `capacitor://localhost` CORS; all 34 CDN assets load.
- Display name "FairVital Go"; bundle ID `com.fairvital.vivohealth`, URL scheme `vivohealth` and the HealthKit
  record key unchanged.
- New app icon (`resources/icon.png`, 1024×1024, opaque) and launch screen with the trademark logo.
- Manual lab entries (CHG-20) refresh the AI plan only after AI consent; the value and the deterministic
  low-value cards and shop suggestions work without it.
