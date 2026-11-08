# Handoff
Updated: 2026-11-08 by Claude Code
Branch: yesterday-review-modal (PR #6)
Plan: docs/plans/07-yesterday-review-modal.md — done (14/14), verifier PASS. Tests 289 / lint / build green
(1 old lint warning: src/i18n/index.tsx:40).
## In progress
Nothing uncommitted.
## Next step (user)
1. ~~Manual browser check~~ done by the user 2026-11-08: all works.
2. ~~/design-sync~~ done 2026-11-08 (4 new components uploaded; last-sync recorded).
3. Review and merge PR #6, then deploy.
## Broken / open questions
- Day boundary is now calendar midnight (user decision 2026-11-07); 04:00 wrap only for bedtime times.
- Weekly goals for constructive habits: deferred to a separate feature (needs scoring decisions).
- Known from before: password-reset email not arriving (Resend test sender); Google sign-in in iOS PWA unverified.
- `--warn` token has no dark-theme value (tokens.css), cosmetic.
