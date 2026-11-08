# Home (chart) — design export

Source: https://claude.ai/design/p/67c2bfac-e6da-422e-98bb-a3415b430a31?file=templates%2Fhome%2FHome.dc.html
(exported 2026-11-08). `Home.dc.html` is the mockup markup verbatim, the script reduced to the parts that
define behavior (sample data generator dropped). It only imports existing components (Pill, HistoryEntry, TabBar).

The mockup is a visual/interaction reference only. Where it disagrees with the plan
(`docs/plans/08-home-chart.md`), the plan wins.

## User decisions (2026-11-08)
- The full «История» list is removed from Home; any day is opened via the chart point or a tile, shown under «Разбор дня».
- Unknown (unreviewed) days are drawn like any other day: color by sign of delta (a skipped day can lower R by the algorithm).
- The clean-day streak badge (EloScore `streak`, `cleanDayStreak`) is dropped from Home; only «Серия плюсовых дней» (delta > 0 in a row).
- Branch: `home-chart` from `main` (PR #6 is merged).
