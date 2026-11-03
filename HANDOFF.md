# Handoff
Updated: 2026-11-03 by Claude Code
Branch: scoring-ruleset-v1 (not pushed, no PR yet)
Plan: docs/plans/01-scoring-ruleset-v1.md, step 9 of 13 (steps 1–9 built + verified PASS)

## In progress
Nothing. Paused by agreement: show the user a worked week on their habits before UI steps 10–13.

## Next step
After the user OKs the worked week: `/build-plan docs/plans/01-scoring-ruleset-v1.md` for step 10, one step at a time.

## Broken / open questions
- Deferred by user: quota overrun rule (zero-count days bad for the rest of the week) — see product context §13 Open.
- Step 10 must: remove the boolean bridge in `src/ui/Review.tsx` (saves numeric/time as false on re-save),
  set date input `min` / catch `DayLockedError` (locked day pick → unhandled rejection).
- Manual check not done: `npm run dev` with existing v1 IndexedDB data → Dexie v2 upgrade runs, history renders.
- `App.tsx` `yesterday` from useState init: `today` may go stale if the app stays open past the day boundary.
- Deploy to Vercel postponed by the user. Stray iOS note at end of LIFE_ELO_PRODUCT_CONTEXT.md still there.
