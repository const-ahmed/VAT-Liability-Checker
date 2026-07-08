# TODO

## Bugs
- [x] Odd character between numbers in sources section (likely a unicode en-dash or similar rendering as a replacement character — e.g. "714 · ¶0"). Fix character encoding/rendering.
- [ ] Sign-in modal stays open after successful auth — modal should close once the user is confirmed signed in. Affects two cases: (1) auto-login on initial load where the user opens the modal before session is restored, (2) manual sign-in/sign-up where the success toast fires but the modal remains visible.
- [ ] Follow-up context after result may produce wrong output — when the user adds context after an initial result, the model may infer details and return an answer that is incorrect for their specific situation.
- [ ] Error handling for nonsensical or incompatible queries — queries that cannot be meaningfully used to determine VAT liability should be caught and surfaced to the user gracefully.

## Features
- [ ] Cancel button — allow the user to cancel an in-progress liability calculation.
- [ ] Landing page — public-facing page for the product. The video preview (see Future) will live here.
- [x] Source links — each cited source (VAT notice) should link to the actual GOV.UK page for that notice.
- [ ] Search history — save previous query results per user. Use the shadcn data table to display history in the liability searcher.
- [ ] User profile / business data — let users enter their business activity (SIC codes or similar) so queries can be contextualised to their business.
- [ ] Companies House automation — script to auto-fetch a user's company data (business activity, SIC codes, and other relevant details) from Companies House using their info, to understand their business well enough to determine VAT treatment without manual entry.
- [ ] Recoverability — use the user's saved business activity to tailor VAT recoverability answers.
- [ ] Account settings — page for users to manage their profile/account.
- [ ] UI switcher — shadcn Select to toggle between the neobrutalism UI and the GOV.UK Design System branch.
- [ ] GDS branch — clickable sources: each cited source should open a new tab to the exact paragraph being referenced on GOV.UK, matching the behaviour already implemented on the main branch.
- [ ] Skeleton loaders — use the shadcn Skeleton component to add loading states to relevant screens in place of blank/spinner transitions.
- [x] Toast — replace current toasts with shadcn Sonner.
- [x] Auth tabs — use shadcn Tabs to combine sign-in and sign-up into a single tabbed component.
- [x] T&C checkbox label — use shadcn Label for the terms and conditions checkbox on sign-up.

## Business
- [ ] Pitch — Canva pitch deck for the product
- [ ] Pitch training — complete the Link Layers course

## Legal
- [ ] Privacy policy
- [ ] Terms of service

## Future
- [ ] Paid features — gate certain features behind accounts. Don't build toward this until explicitly started.
- [ ] Free tier limits — cap the number of liability calculator and recoverability determiner uses for free-tier users.
- [ ] Video preview — short animation showing the liability + recoverability workflow, shown to non-subscribed users in place of the actual (gated) feature.
- [ ] UI redesign — remodel once all features are functional.
