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

- Fairvital Health is a companion app; Shopware (fairvital.com) owns products, prices, cart and checkout — the app only links out to product pages. Why: the shop must not be replaced.
- Product lookups go through `src/lib/shopware.ts` placeholder so a real Shopware Store API can be dropped in later.
- Supplement suggestions (Plan and Heute) use measured out-of-range markers matched to catalog products in the product's own direction (`helpsWhen`, default low). Why: never suggest for normal values or the wrong direction.
- Deficiency-specific routine tips live in `src/lib/deficiency-routines.ts` and share the supplement marker categories. Why: each measured low value needs relevant, maintainable advice rather than generic tips.
- Brand colors/fonts are defined only as tokens in `src/styles.css` so the exact Fairvital CI can be swapped in.
- App identity uses a shared VivoBrand component and global semantic tokens; partner-shop references remain separate. Why: keep rebranding consistent without changing shop ownership.
- App accounts (email, Google, Apple) use Lovable Cloud auth; health state syncs as one JSON row per user in `user_data` from `src/lib/store.tsx`. Why: users need accounts independent of the shop.
- Restore account health state only after verifying identity, and clear it and pending saves on sign-out. Why: shared devices must not display a previous user's personal data.
- AI features (lab PDF reading, voice meal logging) run via server functions in `src/lib/ai.functions.ts` calling the Lovable AI Gateway. Why: keeps the API key server-side.
- The public introduction is `/`, while the existing interactive daily dashboard lives at `/heute`; sign-in continues into `/heute`. Why: preserve the health workflow alongside the requested public home screen.
- The Gesundheit activity summary renders unavailable measurements as empty states, independently of manually entered steps. Why: step totals cannot establish measured activity energy, distance, or pace.
- Expanded activity trends live on a dedicated `/trends` route reached from Gesundheit. Why: detailed metric explanations need a full page with a clear return path rather than a popup.
