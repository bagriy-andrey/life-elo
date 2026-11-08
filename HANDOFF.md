# Handoff
Updated: 2026-11-08 by Claude Code
Branch: yesterday-review-modal (from main, not pushed)
Plan: docs/plans/07-yesterday-review-modal.md — done (14/14), verifier PASS. Tests 289 / lint / build green
(1 old lint warning: src/i18n/index.tsx:40).
## In progress
Nothing uncommitted.
## Next step (user)
1. Manual browser check (`npm run dev`): swipe/fling/keys, focus trap, no Esc/backdrop, background inert;
   fresh sign-in → modal only after first sync; save → done screen until «Продолжить», Home rating matches;
   correct the day on «Обзор дня» (no double credit); remote review while open closes it.
2. Run `/design-sync` (new: FullScreenModal, ProgressSegments, QuotaDots, SwipeCard), then write HEAD to
   `.design-sync/last-sync` and commit.
3. Push the branch and open a PR.
## Broken / open questions
- Day boundary is now calendar midnight (user decision 2026-11-07); 04:00 wrap only for bedtime times.
- Weekly goals for constructive habits: deferred to a separate feature (needs scoring decisions).
- Known from before: password-reset email not arriving (Resend test sender); Google sign-in in iOS PWA unverified.
- `--warn` token has no dark-theme value (tokens.css), cosmetic.
