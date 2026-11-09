# Handoff
Updated: 2026-11-09 by Claude Code
Branch: habits-summary-tiles (from main after PR #10). Plan: docs/plans/11-habits-summary-tiles.md — done, v0.11.0.
Built: Habits screen summary tiles (constructive / destructive, totals + strong/medium/weak counts, paused counted);
shared `StatTile` component (dtsPropsFor added); tier bars extracted into internal `TierBars` (SegmentedControl uses it,
classes renamed `segmented-bar*` → `tier-bar*`).
## In progress
Nothing uncommitted.
## Next step (user)
1. Manual check in `npm run dev` at 375px, light/dark: tiles on the Habits tab (ellipsis, zero rows dimmed),
   HabitSheet importance selector bars look unchanged.
2. Run `/design-sync` (StatTile, TierBars/SegmentedControl, plus older pending BottomSheet/Button/Select/Skeleton/Spinner).
3. Open a PR for habits-summary-tiles, merge, deploy.
## Broken / open questions
- Minor: Habits.test only counts dimmed rows; it doesn't tie per-tier counts to specific rows.
- Carried over: SegmentedControl track not restyled to pill-in-tray; destructive weekly quota after overrun (v1 rule);
  email-change link opens in Safari; Resend test sender limits; Google sign-in in iOS PWA unverified; `--warn` no dark value.
