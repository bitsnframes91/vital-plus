<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Project rules
- Header mascots use transparent CDN videos, still fallbacks and reduced-motion support. Why: blend with either theme without obstructing controls.
- Interface localization uses bundled German-source translation catalogues and React-rendered Localized text, with the applied language saved by AppSettingsProvider; never translate persisted goal identifiers or send health data for translation. Why: all screens switch safely without changing profile data or depending on online translation.
- Step and walking-category icons use the shared StepsIcon component. Why: uploaded artwork and reduced-motion-aware animation stay consistent across views.
- Device presentation preferences use AppSettingsProvider; theme is a light/dark setting that toggles the `.dark` token block in src/styles.css, so all colors must stay semantic tokens (never hardcoded) for dark mode to work. Notification permission is requested only on opt-in, and reminders run only while the app is open. Why: browser-only scheduling must not promise background push delivery.
- There is no in-app lock screen or device biometric gate; the app opens straight to its content after sign-in. Why: the user removed App Lock from the profile, and a hidden gate would lock people out with no way to turn it off.
- Questionnaire edits carry a validated origin so Save and Cancel return Profile users to their personal submenu and Gesundheit users to Gesundheit. Why: editing must preserve the user's navigation context.
- Profile submenus use /profil/$section with AppShell; editors/notices use dialogs; deletion reuses the verified flow. Why: preserve navigation and verified services.
- Impressum uses a bundled data module without translation. Why: preserve verbatim legal wording.
- Open-source licenses use a bundled inventory and downloadable notices generated with `node scripts/generate-licenses.mjs` after production dependency changes; surrounding copy is localized but original notices remain verbatim. Why: make package versions and license evidence accessible offline without inventing notices.

- Shopware (fairvital.com) owns products, prices, cart and checkout; the companion app only links out. Lookups use `src/lib/shopware.ts`. Why: preserve shop ownership and allow later Store API integration.
- Supplement suggestions (Plan and Heute) use measured out-of-range markers matched to catalog products in the product's own direction (`helpsWhen`, default low). Why: never suggest for normal values or the wrong direction.
- Deficiency-specific routine tips live in `src/lib/deficiency-routines.ts` and share the supplement marker categories. Why: keep low-value advice relevant.
- Brand colors/fonts are defined only as tokens in `src/styles.css` so the exact Fairvital CI can be swapped in.
- App logo placements use the shared VivoBrand component backed by a CDN asset pointer, with proportionally padded raster browser and PWA icons; partner-shop references remain separate. Preserve existing published URLs, persisted storage keys and native API identifiers during presentation rebrands. Why: keep logo replacements consistent without changing shop ownership or losing account/device state.
- App accounts use Lovable Cloud auth; `src/lib/store.tsx` syncs health state as one JSON row per user in `user_data`. Why: shop accounts stay separate.
- Restore account health state only after verifying identity, and clear it and pending saves on sign-out. Why: shared devices must not display a previous user's personal data.
- AI lab, voice and food-photo features use server functions calling Lovable AI Gateway; food-photo helpers live in src/lib/food-photo. Why: keys and prompts stay server-side.
- `/` uses shared SwipeAction; questionnaire drafts stay in sessionStorage until signup metadata binds them to that account; initialize missing user_data only after verified identity. Sign-in goes to `/heute`. Why: questionnaire-first signup must not inherit cached account data.
- Apple Health uses verified VitalHealth contracts and AppleHealthProvider; sync checks optional getRequestStatus. Why: new permissions stay opt-in and readings device-local.
- Activity details use `/trends` from Gesundheit. Why: explanations need a full page with a return path, not a popup.

- Nutrition targets are computed centrally from saved adult body and activity data using maintenance estimates, never BMI-based calorie restriction. Why: targets must update with profile changes without implying a medical limit.
- Micronutrients use optional meal amounts and EU adult references via src/lib/micronutrients.ts. Omega fats use optional omega3Mg/omega6Mg/omega9Mg via src/lib/omega3.ts and a dedicated detail route, without invented targets/status. Why: macros cannot establish micronutrients; total omega-3 is not EPA/DHA alone.
- Lab plan preparation passes bounded meal-log context to the AI alongside the report. Why: dietary advice should reflect logged choices without diagnosing deficiencies from meals alone.
- The PWA service worker is generated by vite-plugin-pwa into the client output and registered only from `src/lib/pwa-register.ts`, never in dev/preview. Why: stale workers must not break the editor preview.

- Heute uses wellness-progress.ts and TodayWellnessGoals for live completion; missing Health measurements stay unassessed. Nutrition alerts mirror Ernährung via nutrition-alerts.ts. Neither writes plan history. Why: distinguish goals from clinical status and completed tasks.

- Lab info uses bundled definitions and range-based causes. Why: avoid diagnosis.
- Lab unit presentation and manual/imported entries use lab-units.ts to convert known legacy units with values and reference ranges together; unknown units stay unchanged and incompatible histories must not merge. Why: changing labels alone corrupts clinical meaning.
- Capacitor origins (native-origins.ts) get CORS/CSRF; native-fetch uses the live URL. Why: iOS shells are cross-origin.
- The start page opens its sign-in form via an optional `?mode=login` search param (annotated `{ mode?: "login" }`), and the password-reset screen returns there. Why: a required param would force every plain link to `/` to pass `search`, and users must land back where they started signing in.
- Health-data consent is versioned server-side (health_consents + consent RPCs, HEALTH_CONSENT_VERSION in src/lib/consent-policy.ts); ConsentGate blocks health screens but never /profil, and every AI server function calls enforceAiQuota (DB-atomic consent + per-user limits). Why: consent and AI cost limits must hold against direct API calls.
- Sign-in/signup never reveal whether an email is registered (no account-existence endpoint). Why: prevent account enumeration.
- Health-data writes in user_data require active current-version consent via RLS + trigger (has_active_health_consent); keep HEALTH_CONSENT_VERSION in sync with current_health_consent_version(). Why: consent must hold against direct API calls.
- Account deletion uses a server-only challenge: HMAC-SHA256 (server secret) of a 6-digit code bound to user, challenge and operation, consumed atomically in a row-locked database function callable only by the service role; deletion resumes from server state after partial failure. Why: never trust auth-provider side effects or client flags as proof of verification.
