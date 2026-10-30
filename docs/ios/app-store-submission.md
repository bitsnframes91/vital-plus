# App Store submission — Vital Plus 1.0.0

Prepared on 30 October 2026 for a free, worldwide release on iPhone and iPad. German is the primary language, with English metadata. There are no in-app purchases or subscriptions, and the app will be released manually after approval.

This document replaces the open items in [app-store-readiness.md](app-store-readiness.md), which was written before HealthKit was added. **Nothing here has been submitted to App Review.**

Legend:
- ✅ done in the repository
- 🟡 done in the repository; needs a release or verification
- 🔶 needs a decision or action by the product owner
- ⛔ blocks submission

## 1. Status

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | TestFlight build available and tested | 🔶 | Build 1.0.0 (15) from commit `19fe201` was uploaded (run 40886140173). Its processing state and tester results can only be checked in App Store Connect. **Do not submit build 15**: it has no AI consent step (§3). Submit the build made from this change. |
| 2 | Privacy policy covers Apple Health, voice transcription and third-party AI | 🟡 | `src/lib/privacy-policy.ts` (DE/EN/ES) is rewritten. It goes live once it is published through Lovable (§2). Legal sign-off is still needed (§8). |
| 3 | Consent before personal or health data is sent to third-party AI | 🟡 | A separate, optional AI consent is shown before the first AI request and checked on the server (§3). The app side ships in the next build; the server check takes effect once published. |
| 4 | Terms of Use without placeholders | 🟡 | `src/lib/terms.ts`: the provider and dispute-resolution wording come from the app's Impressum; an Apple EULA clause was added. Legal confirmation is needed (§8). |
| 5 | App Store Connect name is "Vital Plus" | ⛔ | The App Store Connect record is still called **"Vivo Health"** (the upload log reports `App Store Connect app 'Vivo Health'`). The app's home-screen name is "Vital Plus". Rename it under App Information → Name (DE and EN). The name must be available on the App Store. |
| 6 | iPhone and iPad screenshots | ⛔ | Not produced yet. The app supports iPad (`TARGETED_DEVICE_FAMILY = "1,2"`), so iPad 13" screenshots are **required**. Plan in §6. |
| 7 | DE/EN metadata, support URL, review login | 🟡 | Text in §4 and §5. The URLs work only after publishing (§2). The demo account must be created (🔶). |
| 8 | App Privacy, medical disclaimers, worldwide risks | 🟡 | Answers in §7; risks in §8. |
| 9 | Required App Store Connect fields and build selection | 🔶 | Checklist in §9. Done in the App Store Connect UI. |

## 2. Release dependency: publishing the web/server part

The iOS app bundles its own interface but calls the **live** server (`vital-plus.lovable.app`) for AI, account deletion and password reset. The App Store also needs **public** privacy and support URLs. These are served by the web app:

| Page | URL (after publishing) |
|---|---|
| Privacy Policy (DE) | `https://vital-plus.lovable.app/datenschutz` |
| Privacy Policy (EN) | `https://vital-plus.lovable.app/datenschutz?lang=en` |
| Terms of Use | `https://vital-plus.lovable.app/nutzungsbedingungen` (`?lang=en`) |
| Support | `https://vital-plus.lovable.app/support` (`?lang=en`) |
| Legal notice | `https://vital-plus.lovable.app/impressum` |

Today these URLs return **404**, because the Lovable project publishes from `main` and this work is on `feature/ios-native-enhancements`.

To release:
1. Merge `feature/ios-native-enhancements` into `main` with a normal merge (no rebase or force-push; see AGENTS.md).
2. Check in Lovable that the merge synced, then publish.
3. Open the five URLs above and test an AI feature on the web (the consent dialog must appear).

The order matters. Once the server check is published, apps without the consent step are refused AI requests with a message: TestFlight build 15 and older web tabs. This is intended.

## 3. AI consent (App Review Guideline 5.1.2(i))

- **When it is asked:** before anything is sent, the app shows "KI-Auswertung durch Drittanbieter". It lists:
  - what is sent (lab report plus recent meals, food photo, voice recording, typed meal name)
  - that a lab report may show the patient's name and date of birth
  - what is **not** sent (email address, Apple Health values)
  - the recipients (Lovable AI gateway → OpenAI, and Google for speech-to-text)
  - processing possibly outside the EU, purpose, voluntariness, and how to withdraw
- **Buttons:** "Zustimmen und fortfahren" / "Nicht erlauben".
- **Where it applies:**
  - lab upload or photo (asked before the file picker or camera opens)
  - food photo (before the camera)
  - voice entry (before the microphone)
  - automatic nutrient estimate while typing, and the micronutrient backfill (these are silent and only run with consent; without consent the user enters kcal and protein by hand)
- **Withdrawal:** Profil → Meine Daten → "KI-Auswertung widerrufen". Withdrawing health-data consent also clears it.
- **Server check:**
  - `enforceAiQuota` refuses with HTTP 403 when the user's stored account state has no consent for `AI_CONSENT_VERSION`, before any quota is used or data is sent.
  - The consent is saved immediately (not debounced) so the next request sees it.
- **Limit:** the server can confirm the account recorded consent, not who tapped the button. A user calling the API directly with their own token can set it themselves. That is still their own consent.
- **Tests:** `src/test/ai-consent.test.tsx`, `src/test/consent-save-order.test.tsx`, `src/test/voice-meal-entry.test.tsx`.

## 4. Store listing text

Category: **Health & Fitness** (primary), **Food & Drink** (secondary). Price: free, all countries. Copyright: `2026 Fairvital B.V.` (🔶 confirm).

### German (primary)

- **Name:** Vital Plus
- **Untertitel (≤ 30):** Ernährung, Laborwerte & Ziele
- **Werbetext (≤ 170):** Mahlzeiten per Foto, Sprache oder Text erfassen, Laborwerte im Blick behalten und mit Apple Health deine Schritte und deinen Schlaf sehen – alles in einer App.
- **Keywords (≤ 100 bytes):** `Ernährungstagebuch,Kalorien,Protein,Blutwerte,Labor,Vitamine,Mineralstoffe,Omega-3,Schritte,Wasser`
- **Beschreibung:**

```
Vital Plus hilft dir, deine Ernährung, deine Laborwerte und deine Alltagsziele an einem Ort zu verfolgen.

ERNÄHRUNG
• Mahlzeiten per Text, Foto oder Spracheingabe erfassen
• Geschätzte Kalorien, Protein, Ballaststoffe, Kohlenhydrate und Fett
• Übersicht über Vitamine, Mineralstoffe und Omega-Fette
• Wasser und Getränke mitzählen

LABORWERTE
• Werte von Hand eintragen oder einen Befund (PDF oder Foto) auslesen lassen
• Verlauf und Referenzbereiche auf einen Blick
• Erinnerung an die nächste Kontrolle

HEUTE UND ZIELE
• Tagesziele für Schritte, Wasser, Protein und mehr
• Persönlicher Plan mit alltagstauglichen Empfehlungen

APPLE HEALTH (OPTIONAL)
• Schritte, Strecke, Herzfrequenz, Schlaf und Energie aus Apple Health anzeigen
• Diese Werte bleiben auf deinem iPhone
• Auf Wunsch Gewicht, Wasser und Nahrungsenergie in Apple Health speichern

DEINE DATEN
• Gesundheitsdaten werden nur mit deiner ausdrücklichen Einwilligung verarbeitet
• KI-Funktionen (Befund-, Foto- und Spracherkennung) nutzt du nur nach gesonderter Zustimmung; du kannst alles auch von Hand eintragen
• Keine Werbung, kein Tracking
• Daten herunterladen, Einwilligungen widerrufen und Konto löschen direkt in der App

Produktvorschläge verlinken auf den Fairvital-Shop; in der App selbst wird nichts verkauft.

Wichtig: Vital Plus ersetzt keine ärztliche Beratung, Diagnose oder Behandlung. KI-Ergebnisse und Nährwerte sind Schätzungen. Besprich Laborwerte und Nahrungsergänzung mit medizinischem Fachpersonal.
```

### English

- **Name:** Vital Plus
- **Subtitle:** Nutrition, lab values & goals
- **Promotional text:** Log meals by photo, voice or text, keep track of your lab values and see your steps and sleep from Apple Health – all in one app.
- **Keywords:** `food diary,calories,protein,blood test,lab results,vitamins,minerals,omega-3,steps,water,meal log`
- **Description:**

```
Vital Plus helps you keep track of your nutrition, lab values and daily goals in one place.

NUTRITION
• Log meals by text, photo or voice
• Estimated calories, protein, fibre, carbohydrates and fat
• Overview of vitamins, minerals and omega fats
• Track water and drinks

LAB VALUES
• Enter values manually or have a report (PDF or photo) read for you
• History and reference ranges at a glance
• Reminder for your next check

TODAY AND GOALS
• Daily goals for steps, water, protein and more
• Personal plan with practical suggestions

APPLE HEALTH (OPTIONAL)
• Show steps, distance, heart rate, sleep and energy from Apple Health
• These values stay on your iPhone
• Optionally save weight, water and dietary energy to Apple Health

YOUR DATA
• Health data is processed only with your explicit consent
• AI features (report, photo and voice recognition) are used only with separate permission; you can always enter everything manually
• No ads, no tracking
• Download your data, withdraw consent and delete your account right in the app

Product suggestions link to the Fairvital shop; nothing is sold inside the app.

The app interface is available in German, English and Spanish.

Important: Vital Plus does not replace medical advice, diagnosis or treatment. AI results and nutrient values are estimates. Discuss lab values and supplements with a healthcare professional.
```

### URLs

- **Support URL:** `https://vital-plus.lovable.app/support` (EN: `?lang=en`)
- **Marketing URL:** optional; leave empty or use `https://vital-plus.lovable.app/`
- **Privacy Policy URL:** `https://vital-plus.lovable.app/datenschutz` (EN locale: `https://vital-plus.lovable.app/datenschutz?lang=en`)
- **License agreement:** keep Apple's **standard EULA**. The in-app terms refer to it in section 10.

## 5. App Review information

**Sign-in required:** yes.

**Demo account** (🔶 create it):
- a dedicated, confirmed account, e.g. `appreview@fairvital.com`, with a strong unique password
- health-data consent given
- representative data: profile, meals over several days, lab values with history, weight entries
- **AI consent not given**, so the reviewer sees the disclosure dialog
- keep it out of real use, and don't delete it while the app is in review

Authentication is not weakened: the demo account uses the normal email and password sign-in. Sign-in by code and account deletion send a code by email, which the reviewer cannot receive for the demo mailbox. The notes therefore point the reviewer to password sign-in and invite them to test deletion with an account they register themselves.

**Review notes (English):**

```
Thank you for reviewing Vital Plus.

SIGN-IN
On the start screen, sign in with the demo account's email address and password. Please do not use "Mit Login-Code anmelden": login codes are emailed to the account's mailbox.

WHAT TO TRY
• Ernährung (Nutrition): log a meal by text; tap the camera or microphone to see the AI permission dialog.
• Labor (Lab): upload a PDF or photo of a lab report (any sample report) after allowing AI analysis.
• Gesundheit (Health): connect Apple Health (optional). Apple Health data stays on the device and is never sent to our servers or to AI providers.
• Profil → Meine Daten: download data, withdraw consents, delete account.

THIRD-PARTY AI (5.1.2(i))
Before any content is sent, the app asks for separate, explicit permission and names the recipients (Lovable AI gateway → OpenAI; Google for speech-to-text) and the data sent. Without permission all features can be used manually. Permission can be withdrawn under Profil → Meine Daten.

ACCOUNT DELETION (5.1.1(v))
Profil → Meine Daten → Konto löschen. For security, deletion is confirmed with a 6-digit code sent to the account's email address. To test the complete flow, please register a new account with an email address you can access (registration is open in the app) and delete that account.

HEALTH / MEDICAL
Vital Plus does not diagnose or treat. AI results and nutrient values are shown as estimates with a disclaimer; the app recommends consulting a healthcare professional.

PURCHASES
The app sells nothing. Product suggestions open the separate Fairvital web shop (physical goods) in Safari.

LANGUAGE
The interface language can be switched in Profil → App-Einstellungen (German, English, Spanish).
```

**Contact:** name, phone and email of the person reviewers may contact (🔶).

## 6. Screenshots

The App Store requires one set per device class and uses it for smaller sizes. Upload 3–10 per language.

| Device class | Size (portrait) | Required |
|---|---|---|
| iPhone 6.9" (e.g. iPhone 17 Pro Max Simulator) | 1320 × 2868 | yes |
| iPad 13" (e.g. iPad Pro 13-inch (M5) Simulator) | 2064 × 2752 | **yes** (the app supports iPad) |

Recommended shots, the same for DE and EN (set the app language in Profil → App-Einstellungen):
1. Heute: daily goals with progress
2. Ernährung: diary with today's meals and macros
3. Ernährung → Vitamine/Mineralien detail
4. Labor: marker list with history chart
5. Plan: personal recommendations
6. Gesundheit: Apple Health activity, steps and sleep (use real device data or the Simulator's Health app)
7. Profil → Meine Daten: data export, consents and deletion (privacy as a feature)

Rules:
- Use the demo account's data only, never real personal data.
- Don't show a sample lab report with a real person's name.
- Don't add medical claims in captions.
- Screenshots must show the build being submitted. Capture them on the Simulator from the new build (Xcode 26 → Simulator → ⌘S), or on devices.
- I can add a CI workflow that captures them with `xcrun simctl io booted screenshot`, if wanted.

## 7. App Privacy (App Store Connect)

**Tracking:** No. **Data used for third-party advertising:** none.

| Data type | Collected | Linked to user | Tracking | Purpose |
|---|---|---|---|---|
| Contact info → Name | Yes | Yes | No | App Functionality |
| Contact info → Email Address | Yes | Yes | No | App Functionality |
| Health & Fitness → Health | Yes | Yes | No | App Functionality |
| Health & Fitness → Fitness | Yes | Yes | No | App Functionality |
| User Content → Photos or Videos | Yes (sent for AI analysis, not stored) | Yes | No | App Functionality |
| User Content → Audio Data | Yes (sent for transcription, not stored) | Yes | No | App Functionality |
| Identifiers → User ID | Yes | Yes | No | App Functionality |
| Usage Data, Diagnostics, Location, Purchases, Financial info, Contacts, Browsing/Search history, Sensitive info | No | — | — | — |

Notes:
- **Apple Health readings** never leave the device, so they are **not "collected"** in Apple's sense. Health/Fitness is declared because of the values users enter (weight, meals, labs, steps, sleep), which are stored in the account.
- "Linked to user" is Yes for photos and audio because the server sends them on behalf of a signed-in account.
- These answers match `ios/App/App/PrivacyInfo.xcprivacy`.

**Export compliance:** `ITSAppUsesNonExemptEncryption = NO` (HTTPS only), so no documentation is needed.

**Content rights:** the app shows no third-party content beyond the user's own.

**Age rating (new questionnaire):**
- Medical or treatment information: **Infrequent**. The app shows nutrition and lab information with disclaimers; it is not a treatment app.
- Health or wellness topics: **Yes**.
- No user-generated content shared with others, no unrestricted web access (shop links open Safari), no gambling, violence or contests.
- The terms address adults (18+); choose an age rating no lower than what the questionnaire produces (🔶 product owner).

## 8. Risks and legal review

Each item is marked by what it needs.

1. **Legal sign-off (🔶).** The privacy policy and terms were written from the code. Not verified by me:
   - that data-processing agreements and transfer safeguards (DPF or SCCs) exist with Lovable, OpenAI and Google
   - the providers' retention terms
   - that Fairvital B.V. is the contracting provider of the app
   - the dispute-resolution statement taken from the Impressum
2. **Impressum link (🔶).** The Impressum (verbatim from fairvital.com, unchanged) still links the EU ODR platform, which closed in July 2025. Update it at the source, then here.
3. **Medical device regulation (🔶).** Reading lab reports and giving individual recommendations may be in scope of the EU MDR (Rule 11) or other countries' rules. The terms deliberately do **not** state that the app is not a medical device. Get a regulatory assessment before a worldwide release.
4. **Worldwide distribution (🔶).**
   - The legal texts are GDPR-based and only in DE/EN/ES. Some markets have their own health-data and consent rules: South Korea, China (where health apps need extra licensing; consider excluding China mainland), and US states such as Washington's My Health My Data Act.
   - Consider limiting availability to the EU/EEA, Switzerland and the UK for 1.0, and widening it after legal review. This is a business decision.
5. **Name availability (⛔ until checked).** "Vital Plus" must be free on the App Store. If it is taken, App Store Connect rejects the rename. A suffix such as "Vital Plus – Fairvital" would need matching in-app branding.
6. **Guideline 4.2 (minimum functionality).** Native features exist (Apple Health, Keychain, share sheet, camera and microphone). Low risk; the review notes point them out.
7. **"Anonyme Nutzungsstatistik" switch (🔶).** Profil → Meine Daten has a toggle that collects nothing; no analytics exist. A reviewer may ask about it. Recommend removing it in a later change.
8. **Microphone purpose string.** It says the microphone is used for voice meal entry, but not that the recording is transcribed by an external service. The AI dialog discloses this before the first use, so it was left unchanged (native files not touched).

## 9. App Store Connect checklist (do not press "Submit for Review" yet)

App Information:
- [ ] Name: **Vital Plus** (DE + EN)
- [ ] Subtitle (DE + EN)
- [ ] Category: Health & Fitness / Food & Drink
- [ ] Primary language: German
- [ ] Content rights
- [ ] Age rating questionnaire
- [ ] Privacy Policy URL (DE + EN)
- [ ] License agreement: standard

Pricing and availability:
- [ ] Free
- [ ] Countries (all, or limited per §8.4)
- [ ] iPad availability on

App Privacy:
- [ ] Answers per §7
- [ ] Publish

Version 1.0.0, DE and EN:
- [ ] Promotional text, description, keywords
- [ ] Support URL
- [ ] Screenshots: iPhone 6.9", iPad 13"

Build and review:
- [ ] Build: the **new** build with AI consent (not 15)
- [ ] Export compliance: "No" is preset by Info.plist
- [ ] App Review information: demo account, notes, contact
- [ ] Version release: **Manually release this version**
- [ ] Before submitting: the web/server part is published (§2), the five URLs load, and the new build has passed TestFlight on an iPhone and an iPad
