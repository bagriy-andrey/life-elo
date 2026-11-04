# Handoff
Updated: 2026-11-04 by Claude Code
Branch: scoring-ruleset-v1 — PR #3 open (https://github.com/bagriy-andrey/life-elo/pull/3)
Plan: 01 (ruleset v1.1), 02 (grouping), 03 (rename/direction/delete) — all built + verified, Status: done

## In progress
Nothing. Since plan 02: tier colors (tokens --tier-strong/-medium/-weak), commit c562acd.

## Next step
User: `/design-sync` (HistoryEntry grouping + tier colors + new tokens), manual check in `npm run dev`
(v1.1: 3 Nov S = 50; grouping/colors; rename, direction flip, delete), merge PR #3, tick ROADMAP.

## Broken / open questions
- Open in product context §13: weekly minimum goals (sport ≥5/week; interim daily + N/A rest days);
  quota overrun rule (incl. sex reducer making the current day bad); overall scoring review before v2.
- Optional hardening: runtime guard / v3 upgrade re-running idempotent migrations (habits without `versions`).
- `HistoryEntry` clamp note hardcodes «±100»; `App.tsx` `today` may go stale past the day boundary.
- Deploy to Vercel postponed by the user. Stray iOS note at end of LIFE_ELO_PRODUCT_CONTEXT.md still there.
