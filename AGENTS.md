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
- Plan supplement suggestions use measured below-range markers with catalog matches, and link to Fairvital search until verified product URLs are available. Why: avoid suggesting supplements for high values or inventing product pages.
- Version 1 user data lives in a local browser store (`src/lib/store.tsx`); migrate to Lovable Cloud when accounts are added. Why: prototype without backend.
- Brand colors/fonts are defined only as tokens in `src/styles.css` so the exact Fairvital CI can be swapped in.
- Customer login/registration goes through the Shopware Store API via server functions in `src/lib/shop-account.functions.ts` (secrets SHOPWARE_URL, SHOPWARE_ACCESS_KEY). Why: the shop owns customer accounts; the app never stores passwords.
- AI features (lab PDF reading, voice meal logging) run via server functions in `src/lib/ai.functions.ts` calling the Lovable AI Gateway. Why: keeps the API key server-side.
