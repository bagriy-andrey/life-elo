# Handoff
Updated: 2026-11-13 by Claude Code
Branch: garmin-all-data
Plan: docs/plans/18-garmin-redesign.md — done, v0.18.0 (20/20 steps, report + screenshots in docs/plans/18-screens/)
## In progress
Nothing uncommitted. No schema/server changes in plan 18 (status cache is localStorage only).
## Next step (user)
1. Run `/design-sync` (new components: MetricTile, WeekChart, SegmentBar/LegendRow, RangeScale, ProgressBar, FactGrid; TabBar still pending).
2. Eyeball on the phone: Home «Тело» → tile → day page section; week day switching; Обзор дня hints; Profile Garmin block.
## Broken / open questions
- `src/sync/engine.test.ts` flaked once under full-suite load ("release is not a function"), passed on rerun.
- Lint: only pre-existing react-refresh warnings (SegmentBar exports `segmentShares`, Menu, tabIcons, i18n).
- Fixtures have no night ending 13.11 → Home sleep tile shows no score in screenshots (data, not code).
