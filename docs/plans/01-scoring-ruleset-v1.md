# 01 — Scoring ruleset v1

Status: approved
Design input: none

## Why
`LIFE_ELO_PRODUCT_CONTEXT.md` §6.5 (commit bd7de0a) fixes the agreed scoring numbers. The engine still
runs on `PLACEHOLDER_RULESET` with single-threshold rules and outcomes. Goal: implement §6.5 exactly as a
versioned ruleset `RULESET_V1` (zoned habits, 60/20/20 day score, streak rules, quotas, unknown days,
Elo update, review lock, explainable ledger) and let the review screen capture measured values.
No coefficient outside §6.5 may be invented; anything unclear is under "Open questions".

## Design decisions (defaults chosen by the planner, not scoring numbers)
- Stored review = measured entries, not outcomes. `DayReview.entries: Record<habitId, HabitEntry>`,
  `HabitEntry = { kind: 'value'; value: boolean | number | string } | { kind: 'not_applicable' } | { kind: 'unknown' }`.
  `value`: boolean (true = done / complied), count, minutes, steps, or `HH:MM` (bedtime). Zones are DERIVED in the
  engine from value + habit rule + ruleset; the zone is never stored (so editing thresholds/ruleset replays cleanly).
- `Zone = 'excellent' | 'ok' | 'tolerable' | 'bad'`.
- Habit rule (replaces `HabitRule`):
  `{ kind: 'boolean' }` or
  `{ kind: 'measured'; unit: 'count'|'minutes'|'steps'|'time'; better: 'lower'|'higher'; excellent: number|string; ok?: number|string; tolerable: number|string }`
  where thresholds are inclusive bounds on the good side: for `lower`, `v <= excellent` is excellent, `<= ok` ok,
  `<= tolerable` tolerable, else bad; for `higher` the mirror with `>=`. `ok` is optional (zone skipped when absent).
  Example bedtime: lower, excellent 23:00, tolerable 01:00 (no ok). Steps: higher, excellent 10000, tolerable 5000.
  Social media: lower, excellent 0, ok 20, tolerable omitted -> see step 4 (bad above ok).
  Times compare as minutes since the previous day-boundary-anchored evening (00:30 = 24:30, using `DAY_BOUNDARY_HOUR`).
- Quota (optional on any habit, counted per day entry value): `quota?: { perDay?: number; perWeek?: number; reducedByDaysOf?: string }`
  where `reducedByDaysOf` is another habit id: the weekly limit shrinks by 1 for each day this week (Mon–Sun) on which that
  habit was "active" (boolean true, or count > 0), floored at 0. Generic; "sex" is just a constructive boolean habit.
  Quota habit zone: `bad` if day count > perDay or cumulative week count (up to and including the day) > effective weekly
  limit as of that day; otherwise `ok`. Earlier days are never re-scored because of later days.
- Legacy compatibility during the transition: `DayReview.outcomes` stays optional and is normalized to entries by a pure
  `entriesOf(review)` (done->true, not_done->false, complied->true, violated->false, plus not_applicable/unknown;
  legacy rules all treated as `boolean`). Legacy fields are removed in the last steps. Every commit stays green.
- Ruleset `RULESET_V1` (version `'v1'`) holds exactly the §6.5 numbers: tier weights 1/2/3; budget 60/20/20; zone point
  shares +100%/+50%/0/−100%; ok share for destructive complied 50%; streak cap 7 days; soft-decay factor 0.5; recovery
  after >=2 bad days; negative multipliers [1, 1.25, 1.5]; day clamp 100; Elo rate 0.1 and scale 10; review window 1 day.
- Habit versions (resolved Q14): `Habit.versions: { from: DayKey; tier; rule; quota? }[]` sorted by `from`
  (first `from` = `effectiveFrom`). Pure `settingsOn(habit, day)` returns the version in effect; the engine always scores a
  day with that version. Editing settings in the UI appends a version starting today (or replaces today's version);
  name/direction/active stay on the habit itself.
- `replay(habits, reviews, cfg, today: DayKey)` gains `today` (a day-boundary-aware key) so unreviewed days and lock state are pure.
- Ledger/Contribution (also mirrored by hand in `.design-sync/config.json`, see steps 11–12): contribution sources
  `habit | clean_day | streak_bonus(habitId) | unknown_day`; each carries `zone?`, `points`, `multiplier`; `LedgerEntry` gains
  `status: 'reviewed' | 'unknown'`, `dayScore` (S), `expected` (usual day), and drops `capped` in favour of `clamped`.

## Acceptance criteria
- WHEN habits are active THE engine SHALL compute `unit = 60 / Σ tierWeight(active habits)` and award per-habit `weight × unit × zoneShare`.
- WHEN every habit is excellent, no bad, and streaks are 7+ THE day score SHALL be exactly 100; the final score SHALL be clamped to ±100.
- WHEN at least one applicable habit can be bad, none is bad, and none of those is unknown THE app SHALL add the 20-point clean-day bonus; constructive habits SHALL NOT affect it.
- WHEN a habit's settings change from day D THE engine SHALL score days before D with the old settings.
- WHEN a habit has streak n THE streak bonus SHALL be `20 × (weight/Σweights) × min(n,7)/7`.
- WHEN a zone is excellent or ok THE positive streak SHALL +1; tolerable SHALL halve it and reset the negative streak; bad SHALL +1 the negative streak.
- WHEN bad days are consecutive THE bad penalty multiplier SHALL be ×1, ×1.25, ×1.5 (capped from the 3rd).
- WHEN a destructive habit is complied/ok after >=2 consecutive bad days THE first such day SHALL score full weight instead of 50%.
- WHEN a quota habit exceeds its daily limit or its (possibly reduced) weekly limit as of that day THE day SHALL be bad, else ok; earlier days SHALL NOT change.
- WHEN a day is unreviewed after its window THE app SHALL treat it as unknown: no habit points, all streaks break, and Elo uses S = 0 only if R > 0 (R <= 0 stays frozen).
- WHEN a day ended more than one full day ago (by the day boundary) THE review SHALL be locked for edits; yesterday and the day before-ending-today stay editable.
- WHEN a day is confirmed THE rating SHALL update as `R += 0.1 × (10×S − R)` from `R0 = 0`, and the ledger SHALL show S, the expected usual day, and every contribution.
- WHEN a past unlocked day is edited THE replay SHALL recompute everything with no double credit.

## Resolved questions (confirmed by the user on 2026-11-03)
1. Reducer count "so far this week" includes the day being scored.
2. Quota habit with zero count is `ok` (+50%), not `excellent` — unless the cumulative weekly count already exceeds
   the (reduced) limit as of that day: then the day is `bad` even with 0 (confirmed by the user on 2026-11-03).
3. Soft decay halves the positive streak with floor (7 -> 3, 1 -> 0).
4. Streak bonus uses the streak after today's update (for tolerable: the halved value).
5. Negative multipliers: x1 on the 1st consecutive bad day, x1.25 on the 2nd, x1.5 from the 3rd.
6. A `bad` zone resets that habit's positive streak to 0.
7. Recovery applies only to the `ok` zone (50% -> 100%); excellent is already 100%, tolerable stays 0.
8. `not_applicable`: excluded from Σ tierWeight for that day (60 is split among applicable habits), excluded from
   clean-day, streak paused (untouched). Per-habit `unknown` inside a reviewed day: stays in Σ, scores 0, breaks that
   habit's streak, blocks clean day if the habit can be `bad`.
9. Clean-day bonus requires at least one applicable habit that can land in `bad`; no such habit -> no bonus.
10. Expected "usual day" = `ratingBefore / 10`.
11. Engine keeps full precision; display rounds points to 2 decimals and R to 1.
12. Unknown-day decay starts from the earliest `effectiveFrom`; days with no active habits are skipped.
13. Locked days stay visible but are never editable; a locked never-reviewed day stays unknown forever.
14. Habit settings are versioned by date: changing tier, rule thresholds or quota applies from the change day on;
    earlier days keep scoring with the settings that were in effect (see design decision "Habit versions").
15. One reducer level only; a reducer habit must not itself have `reducedByDaysOf`.

## Steps
- [x] 1. Domain types (additive): add `Zone`, `HabitEntry`, `ZonedRule` (`boolean` | `measured`), `Quota`, optional `Habit.quota`, optional `DayReview.entries`; keep old `HabitRule`/`outcomes` as legacy-optional. add optional `Habit.versions` + pure `settingsOn(habit, day)` (falls back to top-level tier/rule while legacy). Add pure `entriesOf(review)` + `normalizeRule(rule)` in a new file — files: `src/domain/types.ts`, `src/domain/legacy.ts`, `src/domain/legacy.test.ts` — verify: `npm test` (every legacy outcome maps to the right entry; legacy rules -> boolean; `settingsOn` picks the version in effect on edge days), `npm run lint`.
- [x] 2. Day helpers: `weekStart(day)` (Monday), `daysInWeekUpTo(day)`, `isDayLocked(day, now)` (locked once `dayOf(now) > addDays(day, 1)`, honouring `DAY_BOUNDARY_HOUR`), `eachDay(from, to)`, `timeToMinutes(hhmm)` (times before the boundary hour count as 24h+ so 00:30 = 1470) — files: `src/domain/day.ts`, `src/domain/day.test.ts` — verify: tests for Mon/Sun week edges, month/year rollover, lock at 03:59 vs 04:00 on D+2, 00:30 vs 23:00 ordering.
- [x] 3. Ruleset: add `RULESET_V1` (+ extend `RulesetConfig` with budget, zone shares, streakFullDays, softDecayFactor, recoveryMinBadDays, negativeMultipliers, dayClamp, eloRate, eloScale, reviewWindowDays); keep `PLACEHOLDER_RULESET` for now but fill new fields so it type-checks. Comment states v1 numbers come from §6.5 — files: `src/engine/config.ts`, `src/engine/config.test.ts` — verify: test asserts every §6.5 number literally and budget sums 60+20+20 = 100.
  - Note: old interface renamed `LegacyRulesetConfig` (rating.ts imports it as alias until step 8); `PLACEHOLDER_RULESET` spreads v1 fields; `budget` is `{habitBase,cleanDay,streak}`; also fixed `isDayLocked` doc comment.
- [x] 4. Zone classification: `classifyZone(habit, entry, cfg)` for boolean (constructive true -> excellent, false -> tolerable; destructive true -> ok, false -> bad) and measured rules (inclusive bounds, optional `ok`, time via `timeToMinutes`; when `tolerable` is omitted anything beyond `ok` is bad) — files: `src/engine/zones.ts`, `src/engine/zones.test.ts` — verify: tests for the §6.5 examples (bedtime 22:59/23:00/00:30/01:00/01:01, steps 10000/9999/5000/4999, social media 0/20/21).
  - Note: `classifyZone(habit, entry)` has no `cfg` param (nothing configurable) and returns `Zone | null`: `null` for N/A, unknown or mismatched values; `ZonedRule.tolerable` made optional in types.ts; `ZoneKey` dropped in favour of `Zone`.
- [x] 5. Quotas: `quotaZone(habit, dayEntries, weekHistory)` implementing daily limit, cumulative weekly limit, generic `reducedByDaysOf` reduction floored at 0, no retroactive change — files: `src/engine/quota.ts`, `src/engine/quota.test.ts` — verify: worked example masturbation <=1/day <=2/week: Mon 1 (ok), Tue 1 (ok), Wed 1 (bad, cum 3 > 2); with sex on Mon: limit 1 so Tue 1 bad; Mon twice = bad (daily); week rollover resets; reducer floors at 0; earlier days unchanged when later sex is logged.
  - Note: signature is `quotaZone(habit: {id, quota}, day, entriesByDay)`; `entriesByDay` maps day -> that day's entries (only Mon..day are read); returns `null` for N/A/unknown/non-count entry or no quota. Boolean true counts as 1. N/A/unknown/missing days add 0 to week totals; a reducer day = boolean true or count > 0.
- [x] 6. Streak transitions: `advanceStreak(state, zone)` with separate positive/negative counters, excellent/ok +1, tolerable halve+reset negative, bad +1 negative (and per open question 6 reset positive), `negativeMultiplier(negStreak)`, `isRecovery(state)` (>=2 prior bad), whole-day-unknown `breakAll` — files: `src/engine/streaks.ts`, `src/engine/streaks.test.ts` — verify: sequences bad,bad,bad,bad give multipliers 1,1.25,1.5,1.5; recovery flag after two bads; halving 7 -> per open Q3; unknown breaks.
  - Note: state is `{pos, neg}`; `advanceStreak(state, zone, cfg)`, `breakStreak()`, `negativeMultiplier(negStreakIncludingToday, cfg)`, `isRecovery(stateBefore, cfg)`. N/A = no call (paused). Excellent/ok also reset `neg` (not stated in §6.5; needed so recovery fires once and bad runs stay consecutive).
- [ ] 7. Day score: `scoreDay({habits, zones, streaks, cfg})` returning `{ S, contributions, clean }`: unit = 60/Σweights, per-habit points = weight×unit×share (ok->50% unless recovery -> 100%, bad × negative multiplier), clean-day bonus 20, per-habit streak bonus `20×(w/Σw)×min(streak,7)/7`, clamp ±100 — files: `src/engine/dayScore.ts`, `src/engine/dayScore.test.ts` — verify: worked examples: single strong habit excellent with streak 7 = 60+20+20 = 100; two habits (medium, weak) mixed zones hand-computed; one bad habit on day 3 of a bad run = −60×(w/Σw)×1.5; unknown destructive blocks clean day; constructive-only day gets no clean-day bonus (Q9); N/A habit excluded from Σ so the remaining habits share 60 (Q8); per-habit unknown scores 0 but stays in Σ; clamp test.
- [ ] 8. Elo + replay: rewrite `replay(habits, reviews, cfg, today)` to use `entriesOf` and `settingsOn(habit, day)` for tier/rule/quota, classify zones (with quota), score days, `R += 0.1×(10S − R)`, produce unknown days (locked & unreviewed days from first tracked day to the last locked day: no points, streaks break, S=0 only when R>0) and `status`, `dayScore`, `expected`, `clamped` in the ledger; remove old multiplier logic; move `rating.test.ts` to the new model (keep: starts at 0, idempotent replay, correction = no double credit) — files: `src/engine/rating.ts`, `src/engine/rating.test.ts`, `src/App.tsx` (pass `today`, switch to `RULESET_V1`) — verify: tests: R after one perfect day = 100... (S=100 -> R=100), 7-day half-way example, positive day below usual lowers R, unknown day decays R>0 by 0.9× and leaves R<=0 untouched, a skipped day can never raise R, unknown day breaks streaks, editing a past day replays equal to fresh replay, pending (unlocked) yesterday not treated as unknown, ledger `expected` = ratingBefore/10; changing a habit's thresholds from day D leaves days before D unchanged. Update `AGENTS.md` placeholder line: ruleset v1 numbers are agreed (§6.5), tuning goes through a new ruleset version.
- [ ] 9. Persistence + lock: Dexie `version(2)` with `.upgrade` rewriting stored reviews (`outcomes` -> `entries`) and habits (`rule`/`tier` -> a single `versions[0]` from `effectiveFrom`, optional `quota`) using the step-1 pure helpers; `confirmDay(day, entries, now)` rejects locked days via `isDayLocked`; stored shape is `entries` only — files: `src/db/db.ts`, `src/db/migrate.ts`, `src/db/migrate.test.ts` — verify: unit tests on the pure migration functions and on the lock guard (`confirmDay` logic factored so it is testable without IndexedDB); manual: open the app with existing v1 data in `npm run dev`, history still renders and the rating matches before/after for boolean-only habits except for the new scoring.
- [ ] 10. Labels and review UI (zone capture): `ZONE_LABEL` (Отлично / В рамках / Терпимо / Плохо), `UNIT_LABEL` (раз, мин, шагов, время), in `Review.tsx` render per rule: boolean -> existing SegmentedControl (+ N/A); measured -> numeric or `type="time"` plain `input` (global style, no new component) plus a «Не актуально» button; quota habit -> count input; unanswered -> `unknown`; show the derived zone live as a `Pill`; disable fields and show «День закрыт» for locked days (date input `min` = earliest unlocked day, locked past days read-only) — files: `src/ui/Review.tsx`, `src/ui/labels.ts`, `src/App.tsx` (pass `now`/lock state) — verify: `npm run build`, `npm run lint`; manual in `npm run dev`: enter bedtime 00:30 -> «Терпимо», 0 min social -> «Отлично», 25 min -> «Плохо», confirm, reopen shows the saved values; a day older than yesterday is locked.
- [ ] 11. Habit setup UI (minimal): in `Habits.tsx` let a new habit pick rule kind (да/нет, число, минуты, шаги, время), direction of "better", thresholds, and an optional quota (per day / per week / reduced by days of another habit chosen from existing habits); list shows the rule summary; editing tier/thresholds/quota of an existing habit appends a version from today (or replaces today's) instead of overwriting — files: `src/ui/Habits.tsx`, `src/ui/labels.ts`, `src/index.css` (only if a form layout class is needed) — verify: `npm run build`; manual: create "Мастурбация" destructive count habit with quota 1/day 2/week reduced by the "Секс" habit and see the review input appear. [design-sync] only if global CSS is touched (then run `/design-sync` afterwards, user-run).
- [ ] 12. [design-sync] Explainable ledger UI: `HistoryEntry` shows S, «Обычный день: +N, сегодня: +M» (expected = ratingBefore/10), zone label per contribution, streak-bonus and unknown-day lines, clamp note; `Home` caption uses the new entry; update `OUTCOME_LABEL` usages to zone labels — files: `src/ui/components/HistoryEntry.tsx`, `src/ui/components/HistoryEntry.css` (if needed), `src/ui/Home.tsx`, `.design-sync/config.json` (hand-update `dtsPropsFor` for HistoryEntry: inlined `LedgerEntry`/`Contribution`), `.design-sync/previews/HistoryEntry.tsx` (new sample ledgers incl. unknown day and expected) — verify: `npm run build`, `npm run lint`, previews compile; drift check: config types equal real types. User later runs `/design-sync` and commits `.design-sync/last-sync`.
- [ ] 13. Remove legacy: delete `PLACEHOLDER_RULESET`, `HabitOutcome`, `OUTCOME_LABEL/TONE/OUTCOMES_FOR` leftovers, legacy `HabitRule` kinds, `DayReview.outcomes` optionality and `src/domain/legacy.ts` normalizers not needed after migration (keep migration helpers in `src/db/migrate.ts`); make `entries` required — files: `src/domain/types.ts`, `src/engine/config.ts`, `src/ui/labels.ts`, `src/domain/legacy.ts` (or removal), `src/engine/rating.test.ts` — verify: `npm test`, `npm run lint`, `npm run build`, grep finds no `PLACEHOLDER_RULESET` / `outcomes`.
