# Handoff
Updated: 2026-11-03 by Claude Code
Branch: scoring-ruleset-v1 (not pushed, no PR yet)
Plan: docs/plans/01-scoring-ruleset-v1.md — all 13 steps built + verified PASS, Status: done

## In progress
Nothing.

## Next step
User: manual check in `npm run dev` (review inputs/zones, habit setup + quota, history ledger, old data upgraded),
then push + PR to main, then tick «Рейтинг v1» in docs/ROADMAP.md.

## Broken / open questions
- Deferred by user: quota overrun rule (zero-count days bad for the rest of the week) — product context §13 Open.
- Hardening (optional): settingsOn / r.entries assume v2 shape with no runtime guard; a v3 upgrade re-running
  the idempotent migrations would cover habits written by intermediate builds.
- `HistoryEntry` clamp note hardcodes «±100» (fine for v1; read dayClamp when a v2 ruleset appears).
- `App.tsx` `yesterday` from useState init: `today` may go stale if the app stays open past the day boundary.
- Deploy to Vercel postponed by the user. Stray iOS note at end of LIFE_ELO_PRODUCT_CONTEXT.md still there.
