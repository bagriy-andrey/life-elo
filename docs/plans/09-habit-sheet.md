# 09 — Habit sheet + constructive weekly goal (ruleset v2)

Status: approved
Design input: `docs/design/habits/Habits.dc.html` + `docs/design/habits/README.md` (Claude Design export, 2026-11-08)

## Why
The Habits screen gets a bottom-sheet create/edit flow (per the mockup), and constructive yes/no habits get a
weekly goal («N days per week»), which v1 cannot express (`LIFE_ELO_PRODUCT_CONTEXT.md` §6.5 and the open
question «N times per week»). Scoring for the goal is a new ruleset version (v2); rating stays derived by `replay`.

## Decisions (made by the user, 2026-11-08) — do not re-open
Source: `docs/design/habits/README.md`; user decisions win over the mockup.

UI
1. Thresholds: keep all three threshold fields (Отлично / Норм / Терпимо) open for measured habits, styled per the
   mockup (the mockup's single «target» field is replaced by the three fields).
2. «За неделю» period exists for constructive AND destructive habits (see scoring below).
3. Quota extras (per-day limit, «weekly limit reduced by days of habit X») stay visible, shown openly under «Норма».
4. Editing uses the same sheet («Изменить привычку»): tap a habit card → sheet with Save, Pause/Resume and Delete
   (with confirmation). Direction (type) is locked when the habit already has answers, as today.
5. List: cards styled per the mockup (colored dot + meta line «Тип · Важность · норма»), but the existing grouping
   by direction and tier stays.
6. The «Больше лучше / Меньше лучше» switch is removed: `better` is derived from direction (constructive → higher /
   for time: earlier is better = «Сделать до»; destructive → lower / «Не позже»). Existing habits whose `better`
   disagrees with their direction keep their stored value unchanged.

Scoring — constructive weekly goal «N days per week» (new ruleset v2; past days are not re-scored under v1
semantics). Applies to constructive **yes/no** habits with period «За неделю» (stepper 1–7). Calendar week Mon–Sun.
- П1 Missed day: while the target is still reachable this week (remaining days ≥ remaining needed), a not-done day
  is *not applicable* (removed from Σ weights, streak paused). Once the target is unreachable, each further
  not-done day is *tolerable* (0).
- П2 Never *bad*: a missed weekly goal only means fewer points.
- П3 Days beyond the target (5th of 4) are still *excellent* (full points).
- П4 Streak counted in **weeks**: number of consecutive weeks with the target met; the current week counts as soon
  as the target is reached. Streak bonus is paid on each done day with the usual formula
  `20 × (weight / Σ weights) × f(weekStreak)`.
  - П4.1 f by tier: strong → full from week 1; medium → ½ in week 1, full from week 2; weak → 0 in week 1, full
    from week 2.
  - П4.2 A week that ends with the target not met halves the week streak (floor), like *tolerable*.
- П5 Weekly period only for yes/no habits. For measured habits (число/минуты/шаги/время) the period switch is
  hidden; destructive «число» keeps the per-day / per-week limit fields (decision 3).
- П6.1 An unreviewed day or per-habit *unknown* counts as «not done» for the weekly target; it does not by itself
  break the week streak (the streak only changes at week end / when the target is reached).
- П6.2 Partial week (habit created mid-week or paused part of the week): target is pro-rated,
  `ceil(N × activeDays / 7)` (e.g. 4/7 from Thursday → ceil(4×4/7) = 3).
- Destructive yes/no with «За неделю» + stepper (0–6) maps onto the existing weekly quota (`quota.perWeek`, each
  «yes» day counts 1) — no new scoring.
- П7 (user, 2026-11-08): a per-habit *not applicable* answer on a weekly-goal habit counts as «not done» (like
  П6.1); it does NOT reduce `activeDays`, the target is not pro-rated for it.

## Findings from code reading (planning defaults, not user decisions)
- `replay(habits, reviews, cfg, today)` takes ONE `RulesetConfig` (`src/engine/config.ts`, `RULESET_V1`, version
  `'v1.1'`); callers: `src/App.tsx`, `src/ui/YesterdayReview.tsx`. There is no per-day ruleset selection yet.
- v2 keeps every v1.1 number (`RULESET_V2 = { ...RULESET_V1, version: 'v2', ... }`) and only adds weekly-goal
  semantics, which trigger only when `settingsOn(h, day).weeklyGoal` exists. No existing habit has one, so all
  past results are bit-for-bit unchanged. Ledger `rulesetVersion` for a day = `'v2'` if any tracked habit has a
  weekly goal that day, else `'v1.1'` (so history stays labelled honestly).
- Weekly-goal habit in `scoreDay`: zone `excellent` (done) or `not_applicable`/`tolerable` (not done, П1); the
  week streak lives in `StreakState.pos` (value = completed-weeks streak + 1 if target already met this week);
  `scoreDay` must NOT call `advanceStreak`/`breakStreak` for it (a tolerable day must not halve a day streak; a
  whole-day unknown must not break it); week-end halving (П4.2) is applied in replay when a new week starts.
- `canBeBad` is false for weekly-goal habits (constructive).
- Weekly goal data: `HabitVersion.weeklyGoal?: { perWeek: number }` (1–7), versioned by date like `quota`.
  Destructive weekly yes/no reuses `quota: { perWeek }` (0–6) and `rule: { kind: 'boolean' }`; review answers for a
  quota habit are numbers 0/1 (`reviewFlow.ts`: bad = 1), `quotaZone` counts them via `countOf` — so «a yes day
  counts 1» already holds (step 2 only pins it with tests). Legacy boolean `true` on a destructive habit means
  «complied», so `quotaZone` must only ever see the 0/1 answers produced by the quota review flow.
- Sync: `records` stores each habit as a JSON blob (`supabase/migrations/20261104000000_records.sql`, generic
  `tbl` + `data`), `migrateHabit` keeps `versions` untouched. No Supabase migration is needed; step 3 only pins
  the round-trip with tests.
- `HabitForm.better` becomes optional (set only by `formOf` from a stored rule); `buildRule(form, direction)`
  uses `form.better ?? deriveBetter(direction, kind)`; the UI clears `better` when `kind` or `direction` changes.
- Review screens: weekly-goal habits are yes/no cards; minimal change = a progress note on the card
  («На этой неделе: X из N», new i18n key) via a pure engine helper. No other change.
- No `Habits` screen test exists yet; this plan adds a `renderToString` smoke test.

## Acceptance criteria
- WHEN a constructive yes/no habit has a weekly goal of 4 and the user did it on Mon–Thu THE app SHALL score each
  done day as excellent, never score a not-done day as bad, and treat later not-done days in that week as neutral.
- WHEN the target is still reachable and a day is not done THE app SHALL exclude that habit from Σ weights and
  keep its week streak.
- WHEN the target can no longer be reached and a day is not done THE app SHALL score that day tolerable (0).
- WHEN a week ends with the target not met THE app SHALL halve (floor) the week streak; WHEN met, increment it.
- WHEN a habit starts mid-week THE app SHALL pro-rate the target as `ceil(N × activeDays / 7)`.
- WHEN rating is replayed over history without any weekly goal THE app SHALL produce results identical to v1.1.
- WHEN a habit with a weekly goal is saved THE app SHALL persist it in `versions[].weeklyGoal` and it SHALL sync to
  another device unchanged.
- WHEN the user taps «Добавить» or a habit card THE app SHALL open the bottom sheet (create / edit) with the
  fields from the mockup; edit has Save, Pause/Resume, Delete (with confirmation); direction is locked once the
  habit has answers.
- WHEN a habit has no habits THE app SHALL show an empty state with the «Добавить» action.
- WHEN the habit is measured THE app SHALL hide the period switch; destructive «число» keeps per-day/per-week
  limits and the reducer select.
- WHEN yesterday is reviewed THE app SHALL show weekly-goal progress on a weekly-goal card without breaking
  answering.

## Open questions
None.

## Steps
- [x] 1. Engine: domain type + ruleset v2 + weekly-goal scoring.
  Files: `src/domain/types.ts` (add `WeeklyGoal { perWeek: number }`, `HabitVersion.weeklyGoal?`),
  `src/engine/config.ts` (add `weeklyStreakFraction: Record<ImpactTier, number[]>` = strong `[1]`, medium
  `[0.5, 1]`, weak `[0, 1]` (index `min(week, len) - 1`, week 0 → 0) to `RulesetConfig`; v1.1 gets the same
  field only as unused/empty-safe default; export `RULESET_V2`), `src/engine/weeklyGoal.ts` (new, pure:
  `weekOf(day)`/Mon–Sun helpers from `src/domain/day.ts`, `weeklyTarget(N, activeDays)` = `ceil(N×activeDays/7)`,
  `weeklyGoalZone(...)` → `excellent | not_applicable | tolerable` per П1/П3/П6.1 using done count Mon..day,
  remaining tracked days after `day`, `weeklyGoalProgress(...)` → `{ done, target }` for the UI,
  `finalizeWeek(base, met)` → `met ? base+1 : floor(base × softDecayFactor)`), `src/engine/dayScore.ts`
  (`DayHabit.weekly?: { weekStreak: number }`: skip `advanceStreak`/`breakStreak`, set `after = { pos: weekStreak,
  neg: 0 }`, bonus fraction from `weeklyStreakFraction`), `src/engine/rating.ts` (use `settingsOn(h, day).weeklyGoal`;
  keep per-habit week state; finalize the previous week when a new week starts; unreviewed locked days do not
  break weekly-habit streaks; per-day `rulesetVersion` as in Findings), `src/App.tsx` + `src/ui/YesterdayReview.tsx`
  (pass `RULESET_V2`; `replay` result for non-goal habits must not change).
  Verify: `npm test` (existing engine tests untouched and green = v1.1 parity), `npm run lint`.
  Note: added optional `RulesetConfig.baseVersion` (v2 -> `v1.1`) for per-day ledger labelling; П7 implemented (N/A answer = not done, activeDays unchanged); weekly tests land in step 2.
- [x] 2. Engine tests with worked examples + destructive weekly yes/no pin.
  Files: `src/engine/weeklyGoal.test.ts` (new), `src/engine/rating.test.ts` (add v2 cases),
  `src/engine/quota.test.ts` (add a destructive yes/no case: answers 0/1, `perWeek: 2`, third «yes» day → bad,
  «no» days ok).
  Worked examples to include: (a) N=4, Mon–Thu done → 4 excellent days, week streak 1 on Thu; Fri–Sun not done →
  neutral (target met); (b) N=5, Mon–Tue missed (reachable: 5 days left needs 5 → ok, then Wed missed →
  unreachable) → Wed tolerable 0, never negative; (c) pro-rating: habit from Thu with N=4 → target 3
  (`ceil(4×4/7)`), 3 done days meet it; (d) streak by tier: strong week 1 full bonus on a done day, medium ½ in
  week 1 and full in week 2, weak 0 in week 1 and full in week 2; (e) week ended below target halves a streak of
  3 → 1, of 1 → 0; (f) unreviewed / unknown day counts as not done and does not break the streak; (g) done day
  5 of 4 still excellent; (h) a replay without weekly goals equals v1.1 output (parity snapshot).
  Verify: `npm test`.
  Note: quota test pins «no» days before the exceeding day only: `quotaZone` is cumulative, so a «no» day after the limit was exceeded is still bad (existing behaviour, not changed). Also done: `goalOf` helper, untracked-week skip pinned, `daysLeftInWeek` removed.
- [x] 3. Sync: pin the new field round-trip (no schema change).
  Note: no schema change; round-trip pinned in `src/db/migrate.test.ts` (push item -> JSON -> `migrateHabit`); records.sql `data` is generic JSON.
  Files: `src/sync/merge.test.ts` or `src/sync/engine.test.ts` (habit with `versions[0].weeklyGoal` survives
  outbox → remote record → pull → `migrateHabit`), `src/db/migrate.test.ts` (new or existing: `migrateHabit`
  keeps `weeklyGoal`). Touch `src/sync/*` or `supabase/` only if a test shows the field is dropped.
  Verify: `npm test`; manual: read `supabase/migrations/20261104000000_records.sql` confirms generic JSON `data`.
- [x] 4. Domain: habit form logic for the sheet.
  Note: `formOf(version)` takes only the HabitVersion (stored `better` comes from its rule); `buildQuota`/`buildWeeklyGoal` take `(form, direction)`; added `habitError.weeklyTarget` to ru/en/uk now (needed to compile); `Habits.tsx` kept the better switch (falls back to `deriveBetter`) until step 8.
  Files: `src/domain/habitSetup.ts`, `src/domain/habitSetup.test.ts`. `HabitForm` gets `period: 'day' | 'week'`
  and `weeklyTarget: string`; `better` optional; `deriveBetter(direction, kind)`; `buildRule(form, direction)`;
  `buildQuota`: destructive boolean + `period 'week'` → `{ perWeek }` (integer 0–6), count keeps
  perDay/perWeek/reducer; new `buildWeeklyGoal(form, direction)` (constructive boolean + week → integer 1–7, else
  `undefined`; new error key `habitError.weeklyTarget`); `editedVersions` and `formOf` carry `weeklyGoal`
  (`formOf` takes the whole `HabitVersion` and the stored `better`); `period` hidden/ignored for measured
  habits (П5). Update callers in `src/ui/Habits.tsx` only as far as needed to compile (screen is rewritten in
  step 8).
  Verify: `npm test` (derive-better table, mismatched stored `better` preserved, weekly target bounds, destructive
  quota mapping).
- [x] 5. [design-sync] New component `BottomSheet` (modal sheet sliding from the bottom, title, close button,
  scrollable body, sticky footer slot; focus trap/restore and Escape like `Dialog`; reuse `FullScreenModal`
  focus logic if practical).
  Files: `src/ui/components/BottomSheet.tsx`, `src/ui/components/BottomSheet.css`, `src/ui/components/index.ts`,
  `.design-sync/config.json` (`dtsPropsFor`: `BottomSheet` props), `src/ui/components/BottomSheet.test.tsx`
  (`renderToString` smoke). Tokens only from `src/ui/tokens.css`; if a new token is needed, add it here.
  Verify: `npm test`, `npm run lint`, `npm run build`.
- [x] 6. [design-sync] New small form components used by the sheet: `Stepper` (− value +, min/max, aria labels
  from props), `WeekDots` (7 dots Mon–Sun, first `value` filled; display only), `ChipGroup` (single-select chips
  for «Как отмечать», same options shape as `SegmentOption`), `TypeCards` (two selectable cards for Тип, with
  disabled state for the locked direction) — if `SegmentedControl` can render the importance bars via an optional
  option `icon`/`bars` node, extend it instead of adding a component (and update its `dtsPropsFor`). No built-in
  language: all texts via props.
  Files: `src/ui/components/{Stepper,WeekDots,ChipGroup,TypeCards}.tsx` + `.css`, `src/ui/components/index.ts`,
  `.design-sync/config.json` (`dtsPropsFor` for every new/changed component),
  `src/ui/components/forms.test.tsx` (`renderToString` smoke for each).
  Verify: `npm test`, `npm run lint`, `npm run build`.
  Note: importance bars via optional `SegmentOption.bars` (1-3) on SegmentedControl (no new component); `TypeCards` options are `{value,title,description,tone}`; `WeekDots` takes `direction`.
- [x] 7. i18n for the sheet and list (ru is the key source, then en, uk).
  Files: `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/uk.ts`. Keys: sheet titles «Новая привычка» /
  «Изменить привычку», field labels (Название, Тип, Важность, Как отмечать, Цель / Норма), period switch
  («За день» / «За неделю»), stepper labels, week-dots hint, empty state, «Добавить», meta-line parts,
  `habitError.weeklyTarget`, review note «На этой неделе: {done} из {target}». Remove keys that become unused
  (the `better` labels), if any i18n test checks key parity run it.
  Verify: `npm test` (i18n parity test if present), `npm run lint`.
  Note: `better.*` keys kept (still used by `Habits.tsx` until step 8, which removes them and `betterLabels`); `habitError.weeklyTarget` unchanged; plural keys for stepper hints and meta-line (`habits.metaWeekGoal/Limit`), measured meta lines are `habits.metaMin*/Max*`; `habits.meta` joins kind · tier · norm; `review.weekProgress` added.
- [x] 8. Habits screen: header «Привычки» + «Добавить», empty state, list cards (dot + meta line
  «Тип · Важность · норма», existing grouping by direction and tier kept, paused cards dimmed), `HabitSheet`
  (create/edit per the mockup: Название, Тип cards, Важность, Как отмечать chips, Цель/Норма block: period switch +
  stepper + week dots for yes/no, three threshold fields for measured, quota fields + reducer select for
  destructive «число»; edit: Save, Pause/Resume, Delete via `Dialog` confirmation; locked direction note;
  validation errors via `Field error`). Remove the `better` switch and the inline add form/inline edit card.
  Files: `src/ui/Habits.tsx`, `src/ui/HabitSheet.tsx` (new), `src/ui/HabitSheet.css` (new; plain CSS, tokens only),
  `src/ui/labels.ts` (meta-line helpers, `weeklyGoal` summary), `src/ui/Habits.test.tsx` (new: `renderToString`
  smoke for empty state, populated list, sheet open for create and edit incl. a weekly-goal habit; see
  `src/ui/Profile.test.tsx`). If `HabitSheet.css` is global-affecting, mark/adjust per design-sync rules.
  Verify: `npm test`, `npm run lint`, `npm run build`; manual: create constructive 4/week, destructive weekly
  yes/no, measured with 3 thresholds, edit/pause/delete in the dev server.
  Note: `better.*`, `betterLabels` and unused habits i18n keys removed; `form.better` cleared on direction/kind change; sheet state in `HabitSheet` (mounted by `Habits`), smoke tests render `HabitSheet` directly; `labels.ts` gets `normSummary`/`habitMeta`; styles for list + sheet in `HabitSheet.css`; manual dev-server check not done.
- [x] 9. Review screens: weekly-goal progress note.
  Files: `src/ui/YesterdayReview.tsx` (show «На этой неделе: X из N» on a weekly-goal card via
  `weeklyGoalProgress` including the answers given so far for `day`), `src/ui/Review.tsx` (same note, or a plain
  no-crash path), `src/domain/reviewFlow.ts` only if the card needs the goal (`card.weeklyGoal`),
  `src/ui/YesterdayReview.test.tsx` (smoke with a weekly-goal habit).
  Verify: `npm test`; manual: answer yesterday for a weekly-goal habit.
  Note: helper `weeklyGoalNote` in `reviewFlow.ts` (no `card.weeklyGoal`; reads `settingsOn`); note shown in both screens; manual check not done. Also removed unused keys `habits.metaMinWeek`/`habits.fieldPeriod` and commented `pickDirection` in `HabitSheet.tsx` (step-8 verifier cleanups).
- [ ] 10. Docs: product context + cleanup.
  Files: `LIFE_ELO_PRODUCT_CONTEXT.md` (§6.5: new subsection «Ruleset v2 — constructive weekly goal (agreed
  2026-11-08)» with П1–П6, the tier table for `f(weekStreak)` and the destructive-weekly-yes/no mapping, plus a
  worked example; remove the open-question entry «Habits scheduled on specific days / "N times per week"
  goals», keeping a one-line note that *specific weekdays* scheduling remains open; update line ~338 summary to
  mention v2), `AGENTS.md` (only if a rule changes: e.g. the Layout line for `src/engine/` mentions
  `weeklyGoal.ts`; Gotchas stay ≤10 lines), `docs/plans/09-habit-sheet.md` (Status: done).
  Verify: read-through; `npm test` and `npm run lint` green.
  Note: Status left for the orchestrator; also added `weeklyGoalNote` unit test and replaced the IIFE in `Review.tsx` (step-9 verifier).
