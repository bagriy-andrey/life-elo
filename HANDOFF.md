# Handoff
Updated: 2026-11-08 by Claude Code
Branch: home-chart (PR #7)
Plan: docs/plans/08-home-chart.md — done (5/5), verifier PASS on every step. Tests 310 / lint / build green
(1 old lint warning: src/i18n/index.tsx:40).
## In progress
Nothing uncommitted. `stash@{0}` "home-chart draft" = pre-plan draft, obsolete; drop after merge.
## Next step (user)
1. Manual check in `npm run dev`: tap points/tiles, 10 days ↔ all-time toggle, scroll, light/dark, ru/en/uk, 375px.
2. ~~/design-sync~~ done 2026-11-08 (HistoryEntry defaultOpen uploaded; last-sync recorded).
3. Review and merge PR #7, then deploy.
## Broken / open questions
- Header Pill tone for delta exactly 0 is green (Pill has no neutral tone), same as the mockup.
- Day boundary is calendar midnight; 04:00 wrap only for bedtime times.
- Weekly goals for constructive habits: deferred (needs scoring decisions).
- Known: password-reset email not arriving (Resend test sender); Google sign-in in iOS PWA unverified.
- `--warn` token has no dark-theme value (tokens.css), cosmetic.
