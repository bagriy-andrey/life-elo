# 08 — Home chart + stats

Status: done
Design input: `docs/design/home/Home.dc.html` + `docs/design/home/README.md` (Claude Design export; user decisions in the README win over the mockup)

## Why
Home currently shows EloScore, the pending Banner and the full history list. The redesign adds a rating-dynamics
chart with per-day deltas, period stats (min/max, best/worst day, plus-day streak) and a «Разбор дня» block for the
selected day. Rating/streaks stay derived from the replayed ledger at render; nothing new is stored
(product context: rating is derived; AGENTS.md rules).

## Decisions (made by the user)
- The full «История» list is removed from Home. The selected day is shown under «Разбор дня» via `HistoryEntry`, expanded by default.
- Unknown days are drawn like any day: color by sign of delta.
- The clean-day streak is dropped from Home. Only «Серия плюсовых дней» (delta > 0 in a row) remains: current = whole history, record = within the shown range.

## Defaults chosen by the planner (proposals, change on review)
- Period toggle («10 дней» / «Всё время») is hidden when the ledger has ≤ 10 days; it is then treated as "all".
- Tile values are colored by sign of the value (the mockup hardcodes best = green, worst = red; with all-positive deltas "worst" would be red while positive). Min/max tiles use the sign of the rating, zero = neutral text color.
- `EloScore` stays as a design-system component (still uses `elo.streak`), just unused by Home. `elo.streak` is kept.
- Initial selection = last day; period change keeps the selection if it is in range, otherwise selects the last day. Selecting a day older than the last 10 switches the range to "all".

## Acceptance criteria
- WHEN the ledger is empty THE app SHALL show «Life Elo» with rating 0, the caption `home.startCaption`, no chart, no tiles, no «Разбор дня».
- WHEN the ledger is non-empty THE app SHALL show the header: signed rating colored pos/neg/neutral, and on the right a Pill with the last day's delta (tone by sign) and «за {day}».
- WHEN a day is pending review THE app SHALL show the existing Banner under the header.
- THE chart SHALL plot rating after each day over the shown range, step = max(28, viewportWidth/10) px, height 190, always including 0 on the scale, scrollable horizontally with the newest day at the right on mount and on range/width change.
- WHEN a point/column is tapped THE app SHALL select that day: dashed guide, tooltip (rating + short date), highlighted dot and chip, and «Разбор дня» shows its `HistoryEntry` expanded.
- Each column SHALL show a delta chip (rounded integer, colored by sign of delta, unknown days included) and a day label (date number; short date at month boundaries).
- THE period header SHALL show the signed rating change over the range («за 10 дней» / «за всё время»; start = `ratingBefore` of the first shown day for 10 days, 0 for all).
- Tiles (over the shown range, ties keep the earliest day): Минимум, Максимум (rating), Лучший день, Худший день (delta); tapping a tile selects that day and scrolls it to center (switching to "all" if it is out of the last 10).
- THE streak tile SHALL show «сейчас N дней» / «сейчас нет» (whole history) and «рекорд M дней» (within the range); tapping it selects the record's last day.
- WHEN the ledger has ≤ 10 days THE app SHALL hide the period toggle and use "all".
- THE full history list and the clean-day streak badge SHALL NOT appear on Home.
- All new texts exist in ru/en/uk; unused `home.history` and `home.lastDelta` are removed.

## Open questions
- (none)

## Steps
- [x] 1. Pure helpers + tests — files: `src/ui/homeStats.ts`, `src/ui/homeStats.test.ts` — implement `rangeStart(len, range)`, `periodStats(ledger, range)` (change, iMin/iMax by rating, iBest/iWorst by delta, streakNow over whole ledger, streakRecord + streakRecordEnd within range), `smoothPath(points)` (mockup cubic bezier), `chartGeometry(ledger, range, viewportWidth)` (step, innerW, points, zeroY, grid, padTop 54 / padBottom 14 / height 190, 0 always on scale, 6% pad). Input is `LedgerEntry[]` from `src/engine/rating.ts`. Consult the discarded draft with `git stash show -p stash@{0}` if useful, do not apply it wholesale. — verify: `npm test` (ties → earliest, empty/1-day ledger, streak now vs record, range ≤10, 0 on scale with all-positive and all-negative ratings).
- [x] 2. [design-sync] `HistoryEntry` `defaultOpen?: boolean` — files: `src/ui/components/HistoryEntry.tsx`, `.design-sync/config.json` (`dtsPropsFor.HistoryEntry`), existing HistoryEntry preview/test if any — pass `open` to `<details>` only as the initial state; selected-day switching must re-mount via `key={entry.day}` in the caller. Default stays closed (no behavior change for other callers). — verify: `npm test`, `npm run lint`, `renderToString` smoke asserts `open` attribute with `defaultOpen`.
- [x] 3. i18n keys — files: `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/uk.ts` — add keys (ru is source): `home.app` (Life Elo), `home.forDay` («за {day}»), `home.chartTitle` (Динамика), `home.period10`, `home.periodAll`, `home.periodLabel10` («за 10 дней»), `home.periodLabelAll` («за всё время»), `home.min`, `home.max`, `home.best`, `home.worst`, `home.streak` («Серия плюсовых дней»), `home.streakNow` («сейчас {count} дней», plural-safe per existing i18n approach), `home.streakNone`, `home.streakRecord`, `home.dayReview` («Разбор дня»), chart aria label. Remove `home.history`, `home.lastDelta`. Keep `home.startCaption`, `home.pending*`. — verify: `npm test` (i18n key-parity test if present), `npm run lint`, `npm run build` (type check, en/uk typed against ru).
  - Note: `home.history` / `home.lastDelta` kept (still used by current Home.tsx); remove in step 5. Added `home.chartAria`.
- [x] 4. HomeChart component — files: `src/ui/HomeChart.tsx`, `src/ui/HomeChart.css` — screen-level (NOT in `src/ui/components/`), plain CSS + tokens from `src/ui/tokens.css`. Props: `ledger`, `selected`, `onSelect(index, {center?})`, `range`, `onRangeChange`. Renders the card: title + period change + toggle (hidden when ≤10 days), scrollable SVG (area gradient, grid, zero line + «0» label, smooth line) with overlaid columns (dot, tooltip, delta chip, day label, aria-label, aria-pressed), ResizeObserver for width, scroll-to-newest on range/width change, smooth scroll-to-center when `center`. Then the tiles grid + streak tile (via `periodStats`). Dot/chip/value colors by sign via `--pos`/`--neg`. — verify: `npm run lint`, `npm run build`, `renderToString` smoke inside step 5's test; manual check at 375px width in `npm run dev`.
  - Note: added i18n key `home.point` (column aria-label); the streak tile is disabled when there is no plus-day record. Manual 375px check and renderToString smoke deferred to step 5.
- [x] 5. Rewrite Home + smoke test — files: `src/ui/Home.tsx`, `src/ui/Home.test.tsx` (+ `src/ui/Home.css` only if needed) — header (title, signed rating colored, Pill with last delta + «за {day}»), pending Banner, `HomeChart`, «Разбор дня» with `<HistoryEntry key={entry.day} defaultOpen entry habits={habitsOn(day)} />`; state `range` (default 10 days) and `selected` (default last day) with the selection rules from "Defaults". Empty ledger → rating 0 + `home.startCaption`, no chart. Remove the history list. — verify: `npm test` with `renderToString` smoke (empty ledger; ledger > 10 days: toggle present; ledger ≤ 10 days: no toggle; pending Banner), `npm run lint`, `npm run build`, manual check in `npm run dev` (select via point and tile, toggle, light/dark theme, ru/en/uk).
  - Note: also folded in step-4 fixes (area closes at zeroY, Card.css import + `.card.home-chart` specificity, tablist aria-label via new `home.rangeLabel`, tap-highlight); `home.history`/`home.lastDelta` removed. Manual dev check not done.
