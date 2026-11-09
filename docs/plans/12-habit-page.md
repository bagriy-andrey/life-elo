# 12 — Habit menu, habit page, heatmap and charts

Status: approved
Design input: `docs/specs/12-habit-page.design.html` (Claude Design export of `templates/habits/Habits.dc.html`; markup on top, `buildDetail` in the bottom `<script>` shows the chart/heatmap math). Spec: `docs/specs/12-habit-page.md` (approved, decisions D1–D4 final; every implementer reads it fully).

## Why
The habit card opens the edit sheet and nothing shows progress. Add a ⋮ menu, a delete confirm, a habit page
(`/habits/:id`) with stats, a 12-month heatmap and a per-type chart, and a grouped list. No scoring change:
rating/streak engine untouched; stats are derived from confirmed reviews only (AGENTS.md rules).

## Acceptance criteria
See spec «Done when». Short form:
- WHEN a card is tapped THE app SHALL open `/habits/:id`; ⋮ opens Информация / Изменить / Пауза|Возобновить / Удалить.
- THE edit sheet SHALL have only «Сохранить» (no Пауза/Удалить); time habits label tolerable «Терпимо до».
- THE heatmap and chart SHALL render for daily yes/no (both directions), Minutes/Count/Steps, Time (with tolerable), weekly yes/no.
- Pure stats are unit-tested; every new/changed screen has a `renderToString` smoke test; touch targets ≥44px; light and dark.

## Open questions
(none)

## Decisions made by the planner (defaults, within the spec)
- Day statuses: `success | fail | tolerable | skipped | nodata | empty | future`. `skipped` = `not_applicable`; `nodata` = no review of that day or `unknown`; `empty` = before the version/habit `effectiveFrom`; `future` = today and later (today is never reviewed yet).
  Success = yes/no done (constructive) / not slipped (destructive); measured = `classifyZone` ∈ {excellent, ok} (D3); time: zone excellent/ok. Time zone `tolerable` -> status `tolerable` (yellow, not success); constructive yes/no «not done» -> `fail`; measured `bad` or constructive measured «below target» (zone tolerable) -> `fail`, except time `tolerable` -> `tolerable`.
- Chart kind: `weekly` = boolean rule AND (`weeklyGoal` on constructive, or `quota.perWeek` on destructive) in the version in force today; `yesno` = other boolean; `time` = measured `time`; `amount` = other measured (count habits with a weekly quota stay `amount`). Version per day via `settingsOn(habit, day)`.
- Norm lines: target = `excellent`. Destructive norm = `tolerable ?? ok ?? excellent`, lowered to `quota.perDay` when that is smaller. Time with no `tolerable`: tolerable bound = `excellent + 30 min` (display only, D2). All time maths through `timeToMinutes`.
- Completion %: window = last 30 days before today (weekly: last 12 weeks); denominator = days with status success/fail/tolerable (skipped, nodata, empty, future excluded); weekly: completed weeks since start plus the current week only if already met; pro-rated target for the first partial week via `weeklyTarget`. No evaluated days -> `null` (UI shows «—»).
- Streaks: daily — walk from habit start to yesterday; success +1; skipped neither adds nor breaks; fail/tolerable/nodata reset; today without answer never breaks. Weekly — consecutive met weeks; current week counts only when met (destructive: only after it ends, so it is excluded while running).
- i18n: ALL new keys land in ONE step (step 4) so later steps never touch `src/i18n/*`. Weekday/month names come from `Intl` (`toLocaleDateString(locale, …)`), not from dictionaries.
- Files that several steps would otherwise share are split by ownership: `HabitSheet.css` belongs to step 7 only; the list gets its own `HabitCard.css` (old `.habit-card*` rules in `HabitSheet.css` are removed by step 14).

## Wave rules for implementers (parallel worktrees)
- A step edits ONLY the files listed for it. Do not edit `src/i18n/*`, `components/index.ts`, `.design-sync/config.json`, `App.tsx` unless the step lists them.
- Use only i18n keys from the list in step 4; if one is missing, use the closest key and mention it in the commit message (the integrator adds it).
- Each step commits only its own files; the checkbox in this plan is ticked by the integrator after merge (avoids merge conflicts in this file).

## Steps

### Wave 1 (pure logic and independent pieces; steps 1–4 are file-disjoint)

- [ ] 1. Habit stats core — **Wave: 1** — **Depends on:** none — files: `src/domain/habitStats.ts`, `src/domain/habitStats.test.ts`.
  Pure, deterministic, no React/Dexie. Exports (names fixed so later steps can code against them):
  `type ChartKind = 'yesno' | 'weekly' | 'amount' | 'time'`; `chartKind(habit, day): ChartKind`;
  `type DayStatus` (see decisions); `interface DayCell { day: DayKey; status: DayStatus; value?: boolean | number | string }`;
  `dayCells(habit, reviews, from, to, today): DayCell[]` (inclusive range, one cell per day, uses `settingsOn` and `classifyZone`);
  `habitNorms(habit, day): { target?: number; limit?: number; tolerableBound?: number; unit; better }` (minutes for time via `timeToMinutes`);
  `currentStreak`, `bestStreak` (daily) and `weekStreaks` (weekly, returns `{ current, best }`) per decisions;
  `completionPercent(habit, reviews, today): number | null` (30 days, or 12 weeks for `weekly`);
  `weekdayPercent(habit, reviews, today): (number | null)[]` (Mon..Sun, % successful days over the last 12 months, `null` when no evaluated days);
  `weekResults(habit, reviews, from, to, today): { weekStart; count; target; met: boolean | null }[]` (count = event days per Mon–Sun week; `met: null` for a week without verdict). Event = «done» for constructive, «slipped» for destructive.
  Reuse `classifyZone` (`src/engine/zones.ts`), `weeklyTarget`/`weekOf` (`src/engine/weeklyGoal.ts`), `eachDay/addDays/weekStart` (`src/domain/day.ts`).
  Verify: tests for every status mapping, both directions, not_applicable/unknown/missing review, today pending, effectiveFrom, tolerable default +30 min, streak and % edge cases (empty, all skipped, version change), weekly first partial week and current-week rules; `npm test`, `npm run lint`.

- [ ] 2. [design-sync] `Menu` popover component — **Wave: 1** — **Depends on:** none — files: `src/ui/components/Menu.tsx`, `src/ui/components/Menu.css`, `src/ui/components/Menu.test.tsx`, `src/ui/components/index.ts` (add `export { Menu, type MenuItem } from './Menu'` — only this step touches `index.ts` in wave 1; later steps must not), `.design-sync/config.json` (`dtsPropsFor.Menu` with JSDoc, plus a `cardMode` entry if neighbours have one), `.design-sync/previews/Menu.tsx` (preview in the style of `previews/StatTile.tsx`), `AGENTS.md` (add `Menu` to the Gotchas components list — only this step edits `AGENTS.md` in wave 1).
  Props: `items: { id: string; label: string; tone?: 'danger'; separatorBefore?: boolean }[]`, `onSelect(id)`, `triggerLabel: string` (aria-label for the ⋮ button), `className?`. Component renders the 44×44 ⋮ trigger itself (`aria-haspopup="menu"`, `aria-expanded`), the trigger `stopPropagation`s click/keydown, popover `role="menu"` with `role="menuitem"` buttons (min-height 44px), opens under the trigger and flips above when there is no room below (measure `getBoundingClientRect` vs `window.innerHeight` on open). Closes on outside pointerdown, Esc (returns focus to the trigger), second tap on ⋮, and after select. Arrow keys move focus (optional nicety, not required). Danger item uses `--neg`. Tokens only (`--card`, `--border`, `--text`, `--neg`, `--radius-*`), plain CSS, light and dark.
  Verify: `Menu.test.tsx` (renderToString: closed state has trigger + aria; open state needs a testable pure helper `placeMenu(rect, menuHeight, viewportHeight): 'below' | 'above'` exported from `Menu.tsx` and unit-tested); `npm test`, `npm run lint`, `npm run build`.

- [ ] 3. [design-sync] `--warn` dark token + route `/habits/:id` — **Wave: 1** — **Depends on:** none — files: `src/ui/tokens.css`, `src/ui/route.ts`, `src/ui/route.test.ts`.
  Tokens: `--warn` exists only in the OS-dark `@media` block; add `--warn: #e6b34d;` (same value) to the forced `:root[data-theme='dark']` block (the two dark blocks MUST stay identical).
  Route: extend the habits variant to `{ tab: 'habits'; id?: string }`; `/habits/:id` parses to `{ tab: 'habits', id }` (id = non-empty single segment, URL-decoded), `routePath` inverse (`encodeURIComponent`); `/habits` stays `{ tab: 'habits' }`; extra segments still fall back to home. `Tab` type unchanged, so `App.tsx` keeps compiling.
  Verify: round-trip tests in `route.test.ts` (list, id, encoded id, trailing extra segment); `npm test`, `npm run lint`.

- [ ] 4. All i18n keys + norm labels — **Wave: 1** — **Depends on:** none — files: `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/uk.ts`, `src/ui/labels.ts`, `src/ui/labels.test.ts`.
  The ONLY step that edits dictionaries. Add as one clearly marked block at the end of each file (`// habit page (spec 12)`), ru is the source of truth, en/uk translated, plurals in the existing `{one, few, many, other}` object style. Keys:
  menu/actions: `habit.menu.aria` (Действия с привычкой), `habit.menu.info` (Информация), `habit.menu.edit` (Изменить), `habit.menu.pause` (Пауза), `habit.menu.resume` (Возобновить), `habit.menu.delete` (Удалить), `habit.badge.paused` (Пауза);
  delete dialog: `habit.delete.title` («Удалить «{name}»?»), `habit.delete.text` (Вся история отметок по привычке будет удалена. Это нельзя отменить.), `habit.delete.confirm` (Удалить);
  page: `habit.back` (Назад), `habit.stat.current` (Текущая серия), `habit.stat.holding` (Держусь), `habit.stat.best` (Лучшая серия), `habit.stat.completion` (Выполнение), `habit.unit.day` and `habit.unit.week` (plural objects, день/дня/дней, неделя/недели/недель — value shown with the number in the tile, so also `habit.unit.weeksShort` not needed), `habit.noValue` (—);
  charts: `habit.chart.last30` (Последние 30 дней), `habit.chart.byMonthDone` (Выполнено по месяцам), `habit.chart.byMonthSlips` (Срывы по месяцам), `habit.chart.lessBetter` (меньше — лучше), `habit.chart.timeByDay` (Время по дням), `habit.chart.byWeek` (По неделям), `habit.chart.today` (Сегодня), `habit.chart.total30` (за 30 дней), `habit.chart.vsPrev` («{delta} к предыдущим 30 дням»), `habit.chart.avgTime` (Среднее за 4 недели), `habit.chart.earlier` («на {count} мин раньше»), `habit.chart.later` («на {count} мин позже»), `habit.chart.same` (как раньше), `habit.chart.onTime` (Вовремя), `habit.chart.tolerable` (Терпимо), `habit.chart.late` (Позже), `habit.duration.hm` («{h} ч {m} мин»), `habit.duration.m` («{m} мин»), `habit.chart.normLabel` (Норма), `habit.chart.targetLabel` (Цель);
  weekday + heatmap: `habit.weekdays.title` (По дням недели), `habit.heatmap.title` (Активность за 12 месяцев), `habit.heatmap.less` (Меньше), `habit.heatmap.more` (Больше), `habit.heatmap.earlier` (Раньше), `habit.heatmap.later` (Позже), `habit.heatmap.nodata` (нет данных), `habit.heatmap.done` (Выполнено), `habit.heatmap.missed` (Пропущено), `habit.heatmap.held` (Держался), `habit.heatmap.slipped` (Срыв), `habit.heatmap.weekMet` (Норма недели выполнена), `habit.heatmap.weekNotMet` (Норма недели не выполнена), `habit.heatmap.cell` («{date} — {value}»);
  sheet: `habits.tolerableUntil` (Терпимо до), `habits.tolerableHint.with` («До {excellent} — отлично, до {tolerable} — терпимо, позже — нарушение»), `habits.tolerableHint.without` (Позже этого времени — нарушение. Между целью и этим временем — терпимо.), `habits.metaTolerable` («{norm}, терпимо до {value}»).
  `labels.ts`: `normSummary` for `time` appends `habits.metaTolerable` only when `rule.tolerable` is stored (D2 default is never shown); add exported pure `formatDuration(t, minutes)` («8 ч 40 мин» / «40 мин») used by charts.
  Verify: `src/i18n/i18n.test.ts` still passes (key parity ru/en/uk), new `labels.test.ts` cases (meta with and without tolerable, `formatDuration`); `npm test`, `npm run lint`.

### Wave 2 (needs wave 1; steps 5–7 are file-disjoint)

- [ ] 5. Chart data — **Wave: 2** — **Depends on:** 1 — files: `src/domain/habitCharts.ts`, `src/domain/habitCharts.test.ts`.
  Pure data builders mirroring `buildDetail` in the design file (read it), all over `DayCell[]` from step 1:
  `amountSeries(habit, reviews, today)` -> 30 bars `{ day, value, state: 'met' | 'below' | 'within' | 'over' | 'nodata' }`, `target`/`norm`, `total` (sum), `previousTotal`, `delta` + `better: boolean`;
  `monthlyCounts(habit, reviews, today)` -> 12 months `{ month: 'YYYY-MM', count, current }` (done count for constructive, slips for destructive);
  `timeSeries(habit, reviews, today)` -> 30 points `{ day, minutes | null, zone }`, bounds `{ target, tolerable }` (D2 default), `share { onTime, tolerable, late }` (%), `avg4w`, `avgPrev4w`, `diffMinutes`;
  `weeklySeries(habit, reviews, today)` -> 16 weeks `{ weekStart, count, norm, met: boolean | null }` with scale 0–7;
  `heatmapGrid(habit, reviews, today)` -> `{ weeks: { weekStart; days: HeatCell[] ; weekMet?: boolean | null }[] (53 columns, Mon..Sun), monthLabels }` where `HeatCell = { day; level: 'nodata' | 'future' | 0..4 | 'pos' | 'neg'; tooltipValue }` — levels per spec §5 (constructive % of target: 0, <50, <100, <150, ≥150; destructive inverse; time by deviation ≤−30, ≤0, ≤+30, later; yes/no two colours; weekly: coloured only when the event happened).
  Verify: tests per kind (daily yes/no both directions, amount constructive/destructive incl. delta direction, time with and without tolerable, weekly both directions, 53×7 grid shape and Monday alignment, future days); `npm test`, `npm run lint`.

- [ ] 6. Delete dialog + habit actions — **Wave: 2** — **Depends on:** 4 — files: `src/ui/HabitDeleteDialog.tsx`, `src/ui/HabitDeleteDialog.test.tsx`, `src/ui/habitActions.ts`, `src/ui/habitActions.test.ts`.
  `habitActions.ts`: `togglePause(habit)` (`db.habits.update(id, { active: !active })`) and `removeHabit(habit): Promise<{ ok: true } | { ok: false; names: string }>` (calls `deleteHabit`; catches `ReducerInUseError` -> `names` = `«A», «B»`, other errors rethrown). `HabitDeleteDialog.tsx`: props `{ habit: Habit | undefined; onClose(); onDeleted() }`; uses `Dialog` with `habit.delete.title`, `habit.delete.text`, «Отмена» (`common.cancel`, `autoFocus`) and `Button variant="danger"` (`habit.delete.confirm`); on `ReducerInUseError` shows the existing `habitError.deleteInUse` text inside the dialog (`<p className="field-error">`) and stays open. Do not touch `HabitSheet.tsx`.
  Verify: renderToString smoke (title with name, text, both buttons, closed = empty) and `habitActions.test.ts` with fake-indexeddb if the repo's db tests already use it, otherwise mock `db`; `npm test`, `npm run lint`.

- [ ] 7. Edit sheet changes — **Wave: 2** — **Depends on:** 4 — files: `src/ui/HabitSheet.tsx`, `src/ui/HabitSheet.css`, `src/ui/HabitSheet.test.tsx` (new smoke test).
  Remove «Пауза»/«Удалить» (state `confirmingDelete`, `togglePause`, `remove`, the `Dialog`, imports of `deleteHabit`/`ReducerInUseError`/`Dialog`) and `.habit-sheet-secondary` CSS; footer = «Сохранить» only. Keep `habits.directionLocked` note and TypeCards `disabled` look (`opacity .55`; adjust CSS if it does not match), keep «Изменения действуют с сегодняшнего дня». For `time`: tolerable field label = `habits.tolerableUntil`, shown under the target; hint under it `habits.tolerableHint.with` (needs target and tolerable entered; values from the form) or `.without`; `ok` threshold stays. Other units keep `habits.tolerable`. Do not change `habitSetup.ts` (D1: no new field).
  Verify: smoke test (edit mode: no «Удалить»/«Пауза» text, has «Сохранить»; time habit shows «Терпимо до» and hint; locked habit shows the lock note); `npm test`, `npm run lint`; manual check of the sheet.

### Wave 3 (steps 8–11 are file-disjoint; components for the page and the new list)

- [ ] 8. Heatmap component — **Wave: 3** — **Depends on:** 5, 4 — files: `src/ui/habit/Heatmap.tsx`, `src/ui/habit/Heatmap.css`, `src/ui/habit/Heatmap.test.tsx`.
  Screen-level component (not in `components/`, no design-sync). Props `{ grid: ReturnType<typeof heatmapGrid>; kind: ChartKind; direction: HabitDirection }`. 53 columns × 7 rows (CSS grid, cell 12×12, gap 3, radius 3), month labels on top, Пн/Ср/Пт/Вс labels (Intl) on the left, horizontal scroll container scrolled to the end on mount (`useLayoutEffect`/ref; guard for SSR), per-cell `title` = `habit.heatmap.cell`, 4 greens via `color-mix(in srgb, var(--pos) N%, var(--card))` at 28/50/75/100, no-data `color-mix(in srgb, var(--text) 7%, transparent)`, future transparent; weekly: 4px strip under each column (`--pos`/`--neg`/neutral). Legend by kind (scale less/more or earlier/later; yes/no labelled colours). Cells are decorative (`aria-hidden` grid + one `role="img"` summary label).
  Verify: renderToString smoke for each kind (53 columns, legend text, strip only for weekly); `npm test`, `npm run lint`.

- [ ] 9. Bar charts (30-day amount, monthly yes/no, weekly) — **Wave: 3** — **Depends on:** 5, 4 — files: `src/ui/habit/BarCharts.tsx`, `src/ui/habit/BarCharts.css`, `src/ui/habit/BarCharts.test.tsx`.
  Exports `AmountChart`, `MonthlyChart`, `WeeklyChart` (props = the matching `habitCharts` result + `direction`, `t`-driven titles). SVG with `viewBox` and `width:100%`, tokens only. Amount: 30 bars, dashed target/norm line, big total (minutes via `formatDuration`) + delta vs previous (green if better, red if worse), date labels start/middle/«Сегодня». Monthly: 12 bars with a number above, current month brighter, destructive `--neg` and caption `habit.chart.lessBetter`. Weekly: 16 weeks, scale 0–7, dashed norm, constructive norm-met `--pos` 55% / not met `--text` 18% / overflow `--pos`, destructive up-to-norm neutral / overflow `--neg`, date labels every 4th week. Each chart has `role="img"` with an `aria-label`.
  Verify: renderToString smoke per chart (title, total/delta text, bar count, dashed line present); `npm test`, `npm run lint`.

- [ ] 10. Time chart + weekday bars — **Wave: 3** — **Depends on:** 5, 1, 3 (`--warn` dark), 4 — files: `src/ui/habit/TimeChart.tsx`, `src/ui/habit/TimeChart.css`, `src/ui/habit/TimeChart.test.tsx`, `src/ui/habit/WeekdayBars.tsx`, `src/ui/habit/WeekdayBars.css`, `src/ui/habit/WeekdayBars.test.tsx`.
  `TimeChart`: three zone backgrounds (`--pos` 10% to target, `--warn` 12% to tolerable, `--neg` 10% later), dashed lines with `HH:MM` labels, dots r=3.5 in the zone colour plus thin `--muted` connecting line (gaps for `null`), share bar + legend with %, top line average time and «на N мин раньше/позже» vs previous 4 weeks. `WeekdayBars`: 7 vertical bars from `weekdayPercent`, best day `--pos`, others `--pos` 55%, labels from `Intl` short weekdays, «—» for `null`.
  Verify: renderToString smoke (zones, labels, legend %, 7 bars, best bar class); `npm test`, `npm run lint`.

- [ ] 11. Habit list: grouping, card, ⋮ menu — **Wave: 3** — **Depends on:** 2, 3, 4, 6 — files: `src/ui/Habits.tsx`, `src/ui/Habits.test.tsx`, `src/ui/HabitCard.tsx`, `src/ui/HabitCard.css`, `src/ui/grouping.ts`, `src/ui/grouping.test.ts` (only if the existing helpers need a change; otherwise leave).
  Groups «Полезные/Нежелательные» → subgroups Сильные/Средние/Слабые with the `TierBars` icon (internal component in `src/ui/components/TierBars.tsx`: import it directly by path; do NOT export it from `index.ts`), empty subgroups hidden, summary tiles unchanged. `HabitCard` (new; props `habit`, `meta`, `onOpen`, `onEdit`, `onTogglePause`, `onDelete`): whole card tappable, `role="button"`/`tabIndex=0`, Enter/Space open; right side `Menu` (Информация→`onOpen`, Изменить, Пауза/Возобновить, separator, Удалить danger); paused → content `opacity .5` + «Пауза» badge next to the name. Use new class names `habit-row*` in `HabitCard.css`; do NOT edit `HabitSheet.css` (stale `.habit-card*` rules are removed in step 14). `Habits` props gain `onOpenHabit(id: string)`; edit opens `HabitSheet`, pause uses `togglePause`, delete opens `HabitDeleteDialog` (step 6). Add `onOpenHabit` as an optional prop defaulting to a no-op so `App.tsx` compiles until step 13.
  Verify: update `Habits.test.tsx` (grouping headers + tier subgroup, paused badge, menu trigger aria-label per card, summary tiles still present, empty state); `npm test`, `npm run lint`; manual check at phone width, dark and light.

### Wave 4

- [ ] 12. Habit page screen — **Wave: 4** — **Depends on:** 1, 2, 4, 5, 6, 7, 8, 9, 10, 11 — files: `src/ui/HabitPage.tsx`, `src/ui/HabitPage.css`, `src/ui/HabitPage.test.tsx`.
  Props `{ habit: Habit | undefined; habits: Habit[]; reviews: DayReview[]; effectiveFrom: string; onBack(): void }`; `habit === undefined` renders nothing (App redirects, step 13). Blocks in spec order: header («‹ Назад» in `--accent`, `Menu` with Изменить/Пауза|Возобновить/Удалить; Изменить opens `HabitSheet`, delete opens `HabitDeleteDialog` and calls `onBack` on success); dot + `<h1>` name + «Пауза» badge; meta line via `habitMeta`; three `StatTile`-style stat tiles built from `src/ui/components/StatTile` is NOT reused if its shape does not fit — use a local `.habit-stat` block instead (no new shared component); values from step 1 (`current` shows «Держусь» label for destructive daily yes/no; units via `habit.unit.day|week`, weekly uses weeks and 12-week %); chart by `chartKind` (`AmountChart` / `MonthlyChart` / `TimeChart` / `WeeklyChart`), then `Heatmap`, then `WeekdayBars`. Compute data with `useMemo` over `habit` + `reviews` + `today`. Min touch target 44px.
  Verify: renderToString smoke for four fixtures (daily yes/no constructive and destructive, minutes, time with tolerable, weekly): h1 name, back link, three stat labels, the matching chart title, heatmap, weekday title; paused badge; `npm test`, `npm run lint`.

### Wave 5 (steps 13–14 are file-disjoint)

- [ ] 13. App wiring — **Wave: 5** — **Depends on:** 3, 11, 12 — files: `src/App.tsx`, `src/ui/App.test.tsx`.
  `route.tab === 'habits' && route.id` → `<HabitPage>` for the matching habit; unknown id → `navigate({ tab: 'habits' }, { replace: true })`; the list gets `onOpenHabit={(id) => navigate({ tab: 'habits', id })}`; back → `navigate({ tab: 'habits' })`. The «Привычки» tab always navigates to the list (`{ tab: 'habits' }`) and `window.scrollTo(0, 0)` when already on the list or coming from the page. TabBar keeps `active="habits"` while on the page. `ScreenSkeleton tab` unaffected.
  Verify: `App.test.tsx` smoke (route `/habits/<id>` renders the page, unknown id handled by the redirect logic extracted as a pure helper if needed); `npm test`, `npm run lint`, `npm run build`; manual flow: list → card → page → ⋮ actions → delete returns to list; reload on `/habits/:id`; back button.

- [ ] 14. Cleanup + cross-screen smoke — **Wave: 5** — **Depends on:** 7, 11, 12 — files: `src/ui/HabitSheet.css` (delete the now-unused `.habit-card*`, `.habit-sheet-secondary` rules; keep `.habits-head`, `.habits-summary`, `.habits-empty`), `src/ui/habitFlow.test.tsx` (new), `.design-sync/NOTES.md` (only if it needs a line about `Menu`).
  `habitFlow.test.tsx`: renderToString of `Habits` + `HabitPage` over one shared fixture set (all five kinds with sample reviews) asserting no throw and key text; confirms the dark `--warn` token exists in both dark blocks of `tokens.css` (read file, regex). Verify: `npm test`, `npm run lint`, `npm run build`, grep shows no leftover `habit-card` selectors.

The version bump (`0.12.0`), merging, plan checkboxes and PR are done by the integrator, not by a step.

## Wave summary
- Wave 1: steps 1, 2, 3, 4
- Wave 2: steps 5, 6, 7
- Wave 3: steps 8, 9, 10, 11
- Wave 4: step 12
- Wave 5: steps 13, 14
