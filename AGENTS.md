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
- Device presentation preferences use AppSettingsProvider and light-only semantic tokens; notification permission is requested only on opt-in, and reminders run only while the app is open. Why: browser-only scheduling must not promise background push delivery.
- App Lock is an account-scoped, device-local privacy gate using verified WebAuthn platform assertions, not account MFA or data encryption; lock on reload and backgrounding, and require verification to disable. Why: browser devices control biometric methods and cannot provide native OS app protection.
- Questionnaire edits carry a validated origin so Save and Cancel return Profile users to their personal submenu and Gesundheit users to Gesundheit. Why: editing must preserve the user's navigation context.
- Profile submenus use /profil/$section with AppShell; editors/notices use dialogs; deletion reuses the verified flow. Why: preserve navigation and verified services.
- Impressum uses a bundled data module without translation. Why: preserve verbatim legal wording.

- Shopware (fairvital.com) owns products, prices, cart and checkout; the companion app only links out. Lookups use `src/lib/shopware.ts`. Why: preserve shop ownership and allow later Store API integration.
- Supplement suggestions (Plan and Heute) use measured out-of-range markers matched to catalog products in the product's own direction (`helpsWhen`, default low). Why: never suggest for normal values or the wrong direction.
- Deficiency-specific routine tips live in `src/lib/deficiency-routines.ts` and share the supplement marker categories. Why: keep low-value advice relevant.
- Brand colors/fonts are defined only as tokens in `src/styles.css` so the exact Fairvital CI can be swapped in.
- App logo placements use the shared VivoBrand component backed by a CDN asset pointer, with proportionally padded raster browser and PWA icons; partner-shop references remain separate. Why: keep logo replacements consistent without changing shop ownership.
- App accounts use Lovable Cloud auth; `src/lib/store.tsx` syncs health state as one JSON row per user in `user_data`. Why: shop accounts stay separate.
- Restore account health state only after verifying identity, and clear it and pending saves on sign-out. Why: shared devices must not display a previous user's personal data.
- AI lab, voice and food-photo features use server functions calling Lovable AI Gateway; food-photo helpers live in src/lib/food-photo. Why: keys and prompts stay server-side.
- `/` uses shared SwipeAction; questionnaire drafts stay in sessionStorage until signup metadata binds them to that account; initialize missing user_data only after verified identity. Sign-in goes to `/heute`. Why: questionnaire-first signup must not inherit cached account data.
- The Gesundheit activity summary renders unavailable measurements as empty states, independently of manually entered steps. Why: step totals cannot establish measured activity energy, distance, or pace.
- Activity details use `/trends` from Gesundheit. Why: explanations need a full page with a return path, not a popup.

- Nutrition targets are computed centrally from saved adult body and activity data using maintenance estimates, never BMI-based calorie restriction. Why: targets must update with profile changes without implying a medical limit.
- Micronutrients use optional meal amounts and EU adult references via src/lib/micronutrients.ts. Omega fats use optional omega3Mg/omega6Mg/omega9Mg via src/lib/omega3.ts and a dedicated detail route, without invented targets/status. Why: macros cannot establish micronutrients; total omega-3 is not EPA/DHA alone.
- Lab plan preparation passes bounded meal-log context to the AI alongside the report. Why: dietary advice should reflect logged choices without diagnosing deficiencies from meals alone.
- The PWA service worker is generated by vite-plugin-pwa into the client output and registered only from `src/lib/pwa-register.ts`, never in dev/preview. Why: stale workers must not break the editor preview.

- Heute nutrition alerts mirror Ernährung statuses via nutrition-alerts.ts, prioritize micronutrients/Omega-3/protein, and never write plan completion history; unassessed Omega stays explicitly without a reference. Why: changing intake must not fabricate deficiencies or completed-day streaks.

- Lab information uses bundled definitions and range-based possible causes. Why: explain readings without diagnosis.
