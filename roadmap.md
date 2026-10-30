# Apple Health integration
- [x] Synchronize verified distance/speed TypeScript contracts and additional-permission check from mobile commit 2ff6253 without merging branches.
- [x] Populate Gesundheit and seven-day Trends with distance and walking/running speed; add translations, 37 passing tests and developer handoff. Browser fallback/navigation checked; measured iPhone rendering awaits the developer.
- [x] Obtain the existing mobile provider and TypeScript contracts; public access to both developer branches verified.
- [x] Wire device-local Apple Health readings to Gesundheit, Heute and historical Trends using the verified provider; manual entries stay separate.
- [x] Add translations and tests, verify browser fallbacks, and document controlled mobile synchronization; 26 tests passed and signed-in browser screens checked.
- [ ] Developer synchronizes the web changes into the mobile branch and verifies on a physical iPhone; blocked on the developer's iOS build/device access.

# Vivo redesign
- [x] Replace Heute tip/progress with five daily-goal circles and remove Schnellzugriff; 29 tests pass, signed-in water updates/persistence and phone/desktop appearance verified. Steps/sleep remain explicitly unavailable until a measured Health feed exists; existing 2 L hydration and EU micronutrient references are labeled, not presented as personalized targets.
- [x] Redesign white Startseite with supplied produce mascot, top-left logo and swipe actions.
- [x] Move new-user questionnaire before account creation; restore signup-bound answers only for a verified new account with no existing health row; tests passed.
- [x] Verify questionnaire-to-registration swipe, email/password empty-input validation, signed-in swipe to Heute and desktop/tablet/mobile presentation; 12 tests passed, no page errors.
- [ ] Verify a real signup confirmation email end-to-end; a login-code email was sent and delivered through notify.fairvitalgo.de on 30 Oct 2026, signup confirmation itself still untested.
- [x] Replace Heute mascot with the supplied cheerful Vitali and Plan runner with the supplied target mascot; signed-in desktop/mobile animation, complete framing and reduced-motion fallbacks verified without page errors.
- [x] Add the supplied doctor mascot to Gesundheit in the matching header position; signed-in desktop/mobile framing, playback and reduced-motion still fallback verified without page errors.
- [x] Place the supplied salad mascot in Ernährung with matching header position, transparent animation and reduced-motion fallback; signed-in desktop/mobile playback verified without page errors.
- [x] Add the supplied animated scientist mascot to Labor; signed-in desktop/mobile playback and reduced-motion fallback verified without changing account data.
- [x] Enable saved Hell/Dunkel and functional notification/reminder switches; keep Einheiten removed.
- [x] Restore language selection for Deutsch, English and Spanish with Apply, saved preference and app-wide translated interface; verify switching and persistence.
- [x] Open an email reset form from Passwort ändern in both Profile account menus; verified both dialogs and reset request tests without sending an unsolicited email.
- [x] Add device-only App Lock with verified platform signatures, reload/background locking and unsupported-device handling; simulated device enable/unlock/failure/disable tested. Actual Apple/Android methods depend on the user's phone and browser.
- [x] Match the expanded profile submenu reference; verified all seven pages, back navigation, questionnaire links, downloads and safe cancellation of account deletion. Unsupported settings and missing support/legal content remain explicitly marked.
- [x] Match the supplied profile menu and connect its six sections; verified signed-in navigation and data download. Direct support contact and official Vivo legal documents await owner-provided details.
- [x] Apply Vivo identity, font and palette throughout app.
- [x] Match the reference home screen while retaining health tools.
- [x] Verify home interactions and phone/desktop rendering.

# Expanded Trends
- [x] Open a dedicated Trends page from Gesundheit in the existing Vivo theme.
- [x] Verify the detail page and return navigation.

# Nutrition recommendations
- [x] Add food-photo capture with circular calculation and animated editable name/calorie/protein filling; three tests and signed-in live photo-to-estimate-to-diary flow passed with account writes blocked. Physical-phone camera testing remains device-dependent.
- [x] Replace Heute plan-task Tagesziele with prioritized yellow/red nutrition cards; preserve plan/history; tests and signed-in meal-to-He ute navigation verified with account writes blocked.
- [x] Expand Omega fette to daily Omega-3/6/9 amounts and a Mineralien-style submenu; tests and signed-in meal-to-submenu flow passed with account writes blocked.
- [x] Add a matching Omega-3 card with daily meal-based estimates; intake tests and signed-in typed-meal-to-card check passed with account writes blocked.
- [x] Add Vitamine and Mineralien daily cards with meal-based estimates, reached-target counts and status faces; tests and signed-in estimate-to-card check passed with account writes blocked.
- [x] Include logged meals when preparing the plan, reinforcing balanced choices and suggesting improvements.
- [x] Ask age, sex and activity in onboarding and calculate daily maintenance estimates.
- [x] Show consumed / recommended amounts on all five nutrition cards, with green smiling, orange neutral from 80%, and red angry over-limit indicators; verified food saves and account persistence.
# Signup confirmation
- [x] Offer a resend-code option on the confirmation screen after a 30-second wait; verified disabled countdown, timer reset and new-code request in German, English and Spanish in the live app with tests.

# European lab units
- [x] Normalize report-specific units in Labor dropdown/cards and manual/import entries, preserving numerical meaning; 19 tests passed and signed-in dropdown verified without writing personal records.

# fairvitalgo rebrand
- [x] Replace the shared logo, browser/PWA icons and app wording across all languages, legal screens, metadata and emails; preserve shop ownership, existing URLs and device identifiers.
- [x] Verify homepage and Today logo, installed-app icons, phone/tablet appearance and seven signed-in screens in German/English/Spanish; all 197 tests pass and build is clean. Existing URLs, draft/cooldown keys and HealthKit account hashes retain legacy identifiers for compatibility.

# Email sender identity
- [x] Set every app and auth email to FairvitalGO <noreply@fairvitalgo.de> delivered via notify.fairvitalgo.de; single shared config module, all seven templates render the brand, 201 tests pass, live login-code email delivered and the published app confirmed on the new sender.
- [x] Replaced the remaining vital-plus.lovable.app references (robots.txt, sitemap route, README, native-origins.ts, native-app.ts, vite.config.mobile.ts) with https://fairvitalgo.lovable.app after the user approved the switch for the iPhone app on 30 October 2026.
