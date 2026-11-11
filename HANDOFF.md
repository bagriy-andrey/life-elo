# Handoff
Updated: 2026-11-11 by Claude Code
Branch: garmin-sync (from main)
Plan: docs/plans/13-garmin-sync.md — done, v0.13.0 (all 9 steps verifier PASS). Spec: docs/specs/13-garmin.md.
Built: Garmin Personal API → Edge Functions garmin-connect/garmin-pull (deployed, migration applied to LifeElo),
Dexie v5 `garmin` table (pull-only), Профиль → Garmin (key + lifetime), habit «Источник», review prefill «из Garmin».
## In progress
Nothing uncommitted.
## Next step (user)
1. Manual check in `npm run dev` at 375px light/dark: Profile Garmin section, habit sheet source + activity types,
   review prefill (steps/time inputs, sport hint line; late rows fill only untouched inputs; offline review).
2. Rollout order: open PR → merge → Vercel deploy → open the app on EVERY device (Dexie v5) → only then paste the key
   (schema-5 garmin rows make v4 clients stop pulling, «update-app»). Then live check: review shows Garmin values.
3. Run `/design-sync` (pending from earlier TabBar work, not plan 13).
## Broken / open questions
- UI to eyeball: expiry warning uses error tone (Notice has no warning tone); sport card shows a text hint only (SwipeCard has no preselect).
- Lint: 3 pre-existing react-refresh warnings. Carried over from HANDOFF 12: Menu a11y, SegmentedControl track, Google sign-in in iOS PWA.
