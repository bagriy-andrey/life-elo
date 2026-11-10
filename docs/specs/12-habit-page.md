# Spec 12: habit menu, habit page, heatmap and charts

Status: approved (2026-11-09). Plan: `docs/plans/12-habit-page.md`.
Design reference: `docs/specs/12-habit-page.design.html` (Claude Design export of
`templates/habits/Habits.dc.html`; markup at the top, sample-data logic in the `<script>` at the bottom —
`buildDetail` shows how every chart/heatmap is computed). Reproduce behaviour and look with existing
components and tokens (`--card`, `--border`, `--text`, `--muted`, `--accent`, `--pos`, `--neg`, `--warn`,
`--radius-*`, `--text-*`). No new colours (exception: a dark-theme value for `--warn`, see D8).

## Decisions (user, 2026-11-09)
- **D1 «Терпимо до» = existing `rule.tolerable`.** No new `tolerance` field, no Dexie/Supabase migration.
  For «Время» the existing tolerable threshold is relabelled «Терпимо до» with the hint below; the other
  thresholds (excellent / ok) stay in the sheet as they are.
- **D2 Default target + 30 min is display-only.** When a time habit has no `tolerable`, charts and zones
  use `excellent + 30 min`; nothing is written into the rule, Elo is unchanged.
- **D3 Day success for measured habits = `classifyZone` ∈ {excellent, ok}** (same as the engine streak).
  Chart target line = `excellent` (constructive); destructive norm = the last non-bad bound
  (`tolerable ?? ok ?? excellent`, or `quota.perDay` when that is the binding limit — planner decides precisely).
  Time «терпимо» (zone tolerable) is not success but is shown yellow.
- **D4 Workflow:** spec (this file) → plan by `planner` → independent steps by `implementer`s in parallel
  worktrees → main session integrates (merge, conflicts) → `verifier` → v0.12.0 + PR.

## Defaults (accepted)
- Habit page has its own route `/habits/:id` (`src/ui/route.ts`); reload/back work; unknown id → list.
- Data = confirmed `DayReview` entries only. Today is not reviewed yet: today's cell is empty and doesn't
  break the streak.
- `not_applicable` = skipped (doesn't break streak, not counted in %). Missing review / `unknown` = breaks the
  streak, shown as «нет данных». Days before `effectiveFrom` = empty, ignored.
- Delete of a habit used as `reducedByDaysOf` → existing `ReducerInUseError` message shown in the dialog.
- Weekly mode exists only for yes/no habits; count habits with a weekly quota are treated as daily.
- Popover menu = new component in `src/ui/components/` (`[design-sync]`, add to `dtsPropsFor`).
  Charts/heatmap = screen-level components using existing tokens.
- D8: add a dark-theme value for `--warn` in `tokens.css` (open item from HANDOFF) in the same palette.
- Pause: visual only (card `opacity .5` + «Пауза» badge, menu item); streak logic ignores pauses for now.
- All new strings in ru/en/uk (`src/i18n`, ru is the key source).

## 1. Habit list
- Grouping «+ Полезные» / «− Нежелательные» → subgroups «Сильные / Средние / Слабые» with the importance
  bar icon (`TierBars`). Empty subgroups hidden. Summary tiles on top stay.
- Tap on a card → **habit page** (not edit). Enter/Space on the focused card does the same.
- Right side of the card: **⋮** button, 44×44, `stopPropagation`.
- ⋮ opens a **popover menu** under the button (above it when there is no room below). Items: Информация,
  Изменить, Пауза / Возобновить, separator, Удалить (`--neg`). Close on outside click, Esc, second tap on ⋮.
- Paused habit: card content `opacity: .5` + «Пауза» badge next to the name; menu shows «Возобновить».

## 2. Delete
Centered confirm dialog: «Удалить «{название}»?», text «Вся история отметок по привычке будет удалена. Это
нельзя отменить.», buttons «Отмена» (default focus) and «Удалить» (`--neg` background). Deleting from the
habit page returns to the list.

## 3. Edit sheet
- Remove «Пауза» and «Удалить» from the sheet; footer has only «Сохранить».
- Type (Конструктивная/Нежелательная) locked when there are answers: `opacity .55`, note «Направление нельзя
  поменять: по привычке уже есть ответы» (exists — check the look).
- Under importance: «Изменения действуют с сегодняшнего дня» (exists).
- «Как отмечать = Время»: the tolerable field is labelled **«Терпимо до»** (time input) under the target, hint
  «До 07:00 — отлично, до 07:30 — терпимо, позже — нарушение» (built from the entered values; without a
  target: «Позже этого времени — нарушение. Между целью и этим временем — терпимо.»).
  Meta line: «до 07:00, терпимо до 07:30» — the «терпимо до» part only when `tolerable` is stored (the D2
  default is not shown in the meta line).

## 4. Habit page
Separate screen, tab bar stays. The «Привычки» tab returns to the list and scrolls to top.
Blocks in order:
1. Header: «‹ Назад» (`--accent`) left, ⋮ right (menu: Изменить, Пауза/Возобновить, Удалить). No separate
   «Изменить» button.
2. Type dot + name (h1) + «Пауза» badge; below, the meta line as on the card.
3. Three stat tiles: **Текущая серия** (destructive daily yes/no: «Держусь»), **Лучшая серия**,
   **Выполнение %** (30 days; weekly: 12 weeks). Units: день/дня/дней, or недели for weekly (i18n plurals).
4. Chart by type (§6).
5. Heatmap (§5).
6. «По дням недели»: 7 vertical bars, % successful days; best day `--pos`, others `--pos` 55%.

## 5. Heatmap (GitHub-like)
- Last 12 months: 53 week columns × 7 days (Mon on top), cell 12×12, gap 3, radius 3. Month labels on top,
  «Пн/Ср/Пт/Вс» on the left. Horizontal scroll, scrolled to the end (today) on open.
- No data — `color-mix(--text 7%)`; future days transparent. Tooltip/title: «9 ноя — значение».
- **Yes/no daily:** 2 colours. Constructive: done `--pos`, missed `--neg`. Destructive: held `--pos`,
  slipped `--neg`.
- **Count / Minutes / Steps / Time:** 4 greens by level (`--pos` 28/50/75/100% over `--card`), no red.
  Level: constructive — % of target (0, <50, <100, <150, ≥150); destructive — inverse (0 → best); Time — by
  deviation from target (≤−30 min, ≤0, ≤+30, later).
- **Weekly yes/no:** a day cell is coloured only if the event happened (`--pos` constructive, `--neg`
  destructive). Under each column a 4px strip: week norm met `--pos`, not met `--neg`, current week without a
  verdict neutral.
- Legend: scale «Меньше ■■■■■ Больше» (Time: «Позже/Раньше»); yes/no: labelled colours.

## 6. Charts by habit type (SVG, viewBox + width:100%)
- **Minutes/Count/Steps** («Последние 30 дней»): 30 bars, dashed target/norm line. Constructive: ≥target
  `--pos`, below `--pos` 35%. Destructive: within norm `--pos`, over `--neg`. Big 30-day total on top
  (minutes as «8 ч 40 мин») and delta vs previous 30 days (green if better, red if worse). Date labels: start,
  middle, «Сегодня».
- **Yes/no daily** («Выполнено по месяцам» / «Срывы по месяцам»): 12 monthly bars, number above each, current
  month brighter. Destructive: `--neg`, caption «меньше — лучше».
- **Time** («Время по дням», 30 days): background of 3 horizontal zones — up to target `--pos` 10%, up to
  tolerable `--warn` 12%, later `--neg` 10%; dashed lines with time labels. Dots r=3.5 in their zone colour +
  thin connecting line `--muted`. Below: share bar (on time / tolerable / late) and legend with %. On top: the
  average time over 4 weeks and «на N мин раньше/позже» vs the previous 4 weeks.
- **Weekly yes/no** («По неделям», 16 weeks): bar = times per week (scale 0–7), dashed norm. Constructive: part
  up to norm `--pos` 55% (norm met) or `--text` 18% (not met), overflow on top `--pos`. Destructive: up to norm
  neutral, over `--neg`. Date labels every 4th week.

## 7. Statistics
- Day success: yes/no — done (constructive) / not slipped (destructive); measured — D3; time — not later than
  target (tolerable is not success but shown yellow).
- Streak: consecutive successful days up to today; today without an answer doesn't break it. Weekly:
  consecutive met weeks; the current week counts only once the norm is met (destructive: only after it ends).
- Pause: visual only, don't exclude pause days from streaks.

## Done when
- Tap card → page; ⋮ → menu; all 4 actions work.
- Edit sheet has no Пауза/Удалить.
- Heatmap and chart render correctly for: daily yes/no (both directions), Minutes, Time (with tolerable),
  weekly yes/no.
- Min touch target 44px, dark and light themes.
- Pure stats logic (series, %, heatmap levels, chart data) is unit-tested; each new/changed screen has a
  `renderToString` smoke test.

## Revision 2026-11-10 (user)
Overrides §4.6, §5 and §6 where they differ.
- Heatmap: no scroll, shows the most recent weeks that fit; title «Активность».
- **Time:** heatmap cells use the time-chart zones (on time `--pos`, tolerable `--warn`, late `--neg`).
  Weekday bars: height = % successful days, label = average time, colour = zone of that average.
- **Yes/no daily:** monthly chart «Успехи и срывы по месяцам» — stacked: successful days `--pos` (bottom),
  misses/slips `--neg` (top), counts above in both colours, legend. Weekday bars: height = % successful days,
  no labels (best day bright).
- **Minutes:** heatmap unchanged; weekday bars: label = average minutes, height = average / max, green shade =
  heatmap level of the average; caption «в среднем, мин» (no «% успешных дней»).
- **Steps:** no weekday bars.
- **Count:** heatmap shades green (constructive) or red (destructive, more times = brighter, 0 = empty);
  weekday bars: label = average times, same shades.
- Weekly yes/no: unchanged.
- Weekday averages: mean of answered values over the last 12 months.
