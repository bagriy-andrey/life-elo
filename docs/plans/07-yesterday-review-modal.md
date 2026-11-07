# 07 — Yesterday review modal

Status: approved
Design input: `docs/design/yesterday-review/YesterdayReview.dc.html` (+ `README.md`). The mockup is a visual/interaction reference; decisions in this plan override it (deadline, weekly goals, N/A button, copy).

## Why
Reviewing yesterday is the core loop (product context §6.5 review window, §7 day boundary) but today it is an optional tab, so days get skipped (streaks break, Elo drops). Goal: a mandatory, non-closable, Tinder-like full-screen flow shown after login whenever yesterday still needs a review, saved through the existing `confirmDay` path (save + replay, no double credit). Day boundary becomes calendar midnight.

## Acceptance criteria

Day boundary
- WHEN the local time is any moment of calendar day D+1 (00:00–23:59) THE app SHALL treat day D as reviewable (`isDayLocked(D, now) === false`) and `reviewDay(now)` SHALL return D.
- WHEN the local time reaches 00:00 of D+2 THE app SHALL treat D as locked and `confirmDay` SHALL throw `DayLockedError`.
- WHEN a bedtime is entered as 00:00–03:59 THE engine SHALL still compare it as late evening (24:00–27:59) via `timeToMinutes` (the 04:00 wrap lives only there).
- THE app SHALL NOT migrate or rewrite stored day keys.
- WHEN the "Обзор дня" tab date picker is shown THE app SHALL allow only yesterday as the earliest day (the day before yesterday is locked from 00:00).

Show condition
- WHEN a user is signed in AND yesterday (`reviewDay(now)`) has at least one applicable habit (`active && effectiveFrom <= day`) AND no confirmed review exists for yesterday AND yesterday is not locked AND `getSyncState().lastSyncedAt` is set on this device THE app SHALL show the yesterday-review modal over the app.
- WHEN `lastSyncedAt` is not yet set (first sync not completed) THE app SHALL NOT show the modal (avoids asking about a day already reviewed on another device).
- WHEN the first sync has completed once THE app SHALL show the modal and it SHALL keep working offline.
- WHEN a synced review for yesterday arrives from another device while the modal is open (no review before) THE app SHALL close the modal (nothing left to review) without losing nothing else.
- WHEN the app regains visibility or the local day changes THE app SHALL re-evaluate the condition (yesterday and lock state).
- WHEN the day is confirmed, or no applicable habits remain, THE modal SHALL NOT reappear for that day.
- WHEN the "Обзор дня" tab is used THE app SHALL still allow correcting an already confirmed day.

Non-closable
- THE modal SHALL have no close button, no logout link, SHALL ignore Esc and backdrop clicks, and SHALL NOT use the existing `Dialog` component (separate full-screen wrapper).
- WHILE the modal is open THE background content SHALL be `aria-hidden` and `inert`, and keyboard focus SHALL be trapped inside the modal (Tab / Shift+Tab cycle).
- WHEN the modal opens THE focus SHALL move into it; WHEN it closes ("Продолжить") focus SHALL return to the app.

Deadline header
- THE header SHALL show "Осталось X ч Y мин. Потом день закроется: серии прервутся" (ru; en/uk equivalents) with the time left until the next local midnight.
- WHEN the current rating (replay of confirmed reviews) is > 0 THE header SHALL append ", рейтинг снизится"; WHEN rating ≤ 0 it SHALL NOT.
- THE countdown SHALL refresh about every 30 s and on visibility change; WHEN less than 1 minute is left THE text SHALL show "0 ч 1 мин" floor (never negative); WHEN midnight passes with the modal open THE modal SHALL close (day locked) and the Home screen SHALL reflect the skipped day.
- WHEN the DST day makes the day 23 or 25 h THE countdown SHALL still end at the real next local midnight (computed from `new Date(y, m, d+1)`).

Cards and order
- THE flow SHALL have stages: yes/no cards, then numeric/time cards, then summary, then done.
- Within each stage cards SHALL be ordered by habit `createdAt` ascending (same as the Habits tab).
- A habit SHALL be a yes/no card WHEN its rule is boolean, OR it has a quota with `perDay` undefined or ≤ 1.
- A habit SHALL be a numeric card WHEN it has a quota with `perDay` > 1 (title "Сколько раз?"), or a measured rule with unit `count` / `minutes` / `steps`; it SHALL be a time card WHEN the measured unit is `time` and there is no quota.
- WHEN a stage has no cards THE flow SHALL skip it; WHEN there are no cards at all THE modal SHALL NOT be shown.
- THE counter SHALL show "N из M" over all cards of both stages and progress segments SHALL show one segment per card (done / current / pending).
- THE card SHALL show a peek of the next card behind it (not on the last card).
- WHEN "↶ Назад" is pressed THE flow SHALL go to the previous card (across the stage boundary) with its previous answer kept; WHEN on the first card THE button SHALL be disabled/hidden.
- WHEN the user changes an earlier answer THE later answers SHALL be kept.

Yes/no answers
- WHEN the user swipes right (or presses ✓ or ArrowRight) THE card SHALL record the "good" answer; WHEN swipes left (or presses ✕ or ArrowLeft) the "bad" answer; then advance to the next card.
- Mapping SHALL be: constructive good = `{kind:'value',value:true}`, bad = `{kind:'value',value:false}`; destructive good ("Удержался") = `{kind:'value',value:false}`, bad ("Сорвался" / "Было" for quota habits) = `{kind:'value',value:true}`. A quota habit with perDay ≤ 1 bad answer counts as 1.
- WHEN the swipe distance is below the threshold THE card SHALL snap back without answering; WHEN a swipe passes the threshold or fling velocity THE card SHALL animate out. WHEN `prefers-reduced-motion` is set THE animation SHALL be skipped but the answer behavior unchanged.
- THE ✕ / ✓ buttons SHALL have accessible labels matching the habit direction, and arrow keys SHALL work only while a yes/no card is focused/active (not inside numeric inputs).
- THE "Не применимо" quiet button SHALL sit under ✕/✓ (no swipe direction) and record `{kind:'not_applicable'}`; it SHALL also be offered on numeric and time cards.
- THE flow SHALL NOT offer "unknown"/"не помню"; saving SHALL be possible only when every card has an answer.

Numeric / time answers
- WHEN the unit is `time` THE card SHALL show an HH:MM input; WHEN invalid or empty THE "Дальше" action SHALL be disabled and the error text from the mockup SHALL show for invalid input.
- WHEN the unit is not `time` THE card SHALL show an integer input with −/+ stepper; step: steps 500, minutes 5, count 1 (quota counts: 1); value SHALL be ≥ 0 integer.
- WHEN the input exceeds the typo guard (steps 100000, minutes 1440, count 1000) or is non-integer/negative/NaN THE card SHALL show the error text and block advancing. The max is a typo guard only, not scoring.
- WHEN a measured rule exists THE card SHALL show the goal label derived from rule `excellent` (e.g. "Цель: 8 000 шагов"; time as "до 23:00" / "не позже"/"не раньше" per `better`).
- WHEN a numeric/time answer is saved THE entry SHALL be `{kind:'value', value: number}` (time: `"HH:MM"` string).

Weekly quota dots
- WHEN a destructive habit's settings have `quota.perWeek` THE card SHALL show dots for used-this-week (Mon..yesterday−1, confirmed reviews only) out of the effective weekly limit, in warn color, `neg` when exhausted, with note "Использовано N из L".
- WHEN the limit is exhausted THE note SHALL read "Лимит исчерпан: ответ «Было» его превысит".
- THE effective limit SHALL honor `reducedByDaysOf` exactly like `quotaZone` (reducer-active days Mon..yesterday−1, floored at 0).
- THE dots block SHALL NOT be shown for constructive habits (weekly goals for constructive habits are out of scope).

Summary and save
- WHEN all cards are answered THE summary SHALL list every habit with its answer; WHEN a row is tapped THE flow SHALL show only that habit's card and return to the summary after answering (other answers untouched).
- WHEN "Сохранить" is pressed THE app SHALL call `confirmDay(day, entries, now)` with entries for all applicable habits; WHEN it succeeds THE done screen SHALL show.
- WHEN save fails with `DayLockedError` THE modal SHALL show `review.dayClosedError` text and a single "Закрыть" action that dismisses it (the only exit); WHEN it fails otherwise THE modal SHALL show `review.saveError` and keep answers for retry.
- THE save button SHALL be disabled while saving (no double submit).
- Rating and streaks SHALL NOT be stored; only the raw review is written (synced via the existing outbox).

Done screen
- THE done screen SHALL show the Elo delta (signed) and resulting rating, the day score vs the "usual day" (`R/10`, §6.5) computed from the ledger entry of the day (before vs after replay), and habits whose streak grew or broke.
- WHEN no streak changed THE streak block SHALL be hidden.
- WHEN "Продолжить" is pressed THE modal SHALL close and Home SHALL show the new rating.

i18n and visual
- THE copy SHALL exist in ru/en/uk with ru as key source; counts use `PluralForms`.
- THE screen SHALL use plain CSS + tokens from `src/ui/tokens.css`; new components SHALL be exported from `src/ui/components/index.ts` and listed in `.design-sync/config.json` → `dtsPropsFor`.

## Spec

Flow
1. `App` → `MainApp` computes `pendingDay` (existing) + sync gate (`lastSyncedAt`) → renders `<YesterdayReview>` inside `FullScreenModal` while shown; `<main>`/`TabBar` wrapper gets `inert` + `aria-hidden`.
2. Stage A yes/no cards → stage B numeric/time cards → summary → done. State: `answers: Record<habitId, HabitEntry>`, `index`, `editingFromSummary?: habitId`.
3. Save: `confirmDay(day, full, new Date())`, `full` = all applicable habits (all answered). Done data computed from `replay(habits, reviews, RULESET_V1, today)` vs `replay(habits, [...reviews, savedReview], RULESET_V1, today)`.

Data mapping (pure modules, Vitest)
- `src/domain/reviewFlow.ts`: `buildCards(habits, day): ReviewCard[]` with `ReviewCard = {habitId, stage:'boolean'|'numeric'|'time', direction, quota?, weekly?}` (uses `settingsOn(h, day)`; ordered boolean-first then by `createdAt`); `entryForYesNo(direction, 'good'|'bad')`; `parseNumeric(text, unit)` → `{ok, value}` | `{ok:false, error:'empty'|'invalid'|'max'}` (max: steps 100000, minutes 1440, count 1000); `parseTime(text)`; `stepFor(unit)` (steps 500, minutes 5, count 1); `goalLabelParts(rule)`.
- `src/domain/reviewDeadline.ts`: `nextMidnight(now)`, `timeLeft(now)` → `{hours, minutes}`, `deadlineCopy(rating)` → whether to append "rating will drop" (`rating > 0`).
- `src/engine/quota.ts`: new exported `weeklyQuotaUsage(habit, day, entriesByDay)` → `{used, limit}` for Mon..day−1 (shares `countOf`/`isActive` with `quotaZone`; `limit = max(0, perWeek − reducerActiveDays)`).
- `src/domain/reviewOutcome.ts`: `reviewOutcome(before: ReplayResult, after: ReplayResult, day)` → `{delta, ratingAfter, dayScore, expected (R/10), streaksGrew: {habitId, pos}[], streaksBroke: {habitId, was}[]}`. Streak grew = `after.pos > before.pos`; broke = `before.pos > 0 && after.pos === 0` (neg-run growth is not "grew"). Only the saved day's ledger entry is read.
- Show condition helper `shouldShowYesterdayReview({habits, reviews, now, lastSyncedAt})` in `src/domain/reviewFlow.ts`.

Copy keys (ru source; add to `ru.ts`, `en.ts`, `uk.ts`, prefix `yr.`)
`yr.title`, `yr.deadline` (`{h}`, `{m}`), `yr.deadlineStreaks`, `yr.deadlineRating`, `yr.counter` (`{n}`, `{total}`), `yr.back` ("↶ Назад"), `yr.good.constructive`/`yr.bad.constructive` ("Сделал"/"Не сделал"), `yr.good.destructive` ("Удержался"), `yr.bad.destructive` ("Сорвался"), `yr.bad.quota` ("Было"), `yr.notApplicable`, `yr.howMany` ("Сколько раз?"), `yr.goal` (+ time variants), `yr.err.empty|invalid|max`, `yr.next`, `yr.quota.used` ("Использовано {n} из {limit}"), `yr.quota.exhausted`, `yr.summary.title`, `yr.summary.edit`, `yr.save`, `yr.saving`, `yr.done.title`, `yr.done.delta`, `yr.done.score` (day vs usual), `yr.done.streakGrew`, `yr.done.streakBroke` (plural forms for days), `yr.done.continue`, `yr.closedClose`. Reuse `review.dayClosedError` / `review.saveError`. Error texts follow the mockup wording.

## Open questions
- (none)

## Steps
- [ ] 1. Domain: calendar-midnight day boundary. Remove `DAY_BOUNDARY_HOUR` from `dayOf`/`reviewDay`/`isDayLocked` (no `boundaryHour` params; `dayOf` = `toDayKey`); keep a private `NIGHT_WRAP_HOUR = 4` only in `timeToMinutes`. Update tests: isDayLocked locks at D+2 00:00 (D+1 23:59 open), `reviewDay` at 00:30/23:59, `dayOf` 00:30 same day, `buildReview` lock guard, `timeToMinutes('00:30')` still 1470. Fix `Review.tsx`/`Habits.tsx` only if they break (`dayOf(now)` still compiles) — files: `src/domain/day.ts`, `src/domain/day.test.ts`, `src/db/migrate.test.ts`, `src/engine/rating.test.ts` — verify: `npm test`, `npm run lint`.
- [ ] 2. Docs for the boundary: `LIFE_ELO_PRODUCT_CONTEXT.md` §6.5 review window ("yesterday can be reviewed until 23:59 today, locks at 00:00") and §7 wording (calendar midnight; 04:00 wrap only for bedtime comparison); `AGENTS.md` gotcha line "Age/birth use the calendar date…" (drop the 04:00 mention; `dayOf` is now calendar) and Layout line if needed; fix mentions in older plans only if they contradict code (leave history as is) — files: `LIFE_ELO_PRODUCT_CONTEXT.md`, `AGENTS.md` — verify: grep for `04:00|DAY_BOUNDARY_HOUR` shows only the `timeToMinutes` wrap and historical plans.
- [ ] 3. Pure flow logic: `buildCards`, `entryForYesNo` (mapping table incl. quota), `parseNumeric`, `parseTime`, `stepFor`, `goalLabelParts`, `shouldShowYesterdayReview` — files: `src/domain/reviewFlow.ts`, `src/domain/reviewFlow.test.ts` — verify: tests for ordering (boolean first, then `createdAt`), perDay undefined/1/3 classification, answer mapping for all four direction × good/bad (+ quota "Было"), max/step per unit, time parsing, not-yet-synced / locked / already-reviewed / no-habits show conditions.
- [ ] 4. Deadline logic: `nextMidnight`, `timeLeft`, `deadlineShowsRating(rating)` — files: `src/domain/reviewDeadline.ts`, `src/domain/reviewDeadline.test.ts` — verify: tests for 23:59:30, 00:00 edge, month end, DST day (e.g. 2026-10-25 / 2026-03-29 in local TZ via explicit `new Date(y,m,d)`), floor to ≥ 0, rating >0 vs ≤0 copy flag.
- [ ] 5. Weekly quota usage: export `weeklyQuotaUsage` from the engine sharing `countOf`/`isActive` with `quotaZone` — files: `src/engine/quota.ts`, `src/engine/quota.test.ts` — verify: tests (Monday = 0 used, mid-week count, `reducedByDaysOf` lowers limit, floor at 0, only confirmed days passed, N/A/unknown add nothing); existing `quotaZone` tests still pass.
- [ ] 6. Done-screen outcome: `reviewOutcome(before, after, day)` — files: `src/domain/reviewOutcome.ts`, `src/domain/reviewOutcome.test.ts` — verify: test with `replay` fixtures: positive delta, R≤0 frozen, streak grew, streak broke, no change, `expected = ratingBefore/eloScale`.
- [ ] 7. [design-sync] `FullScreenModal` component: fixed full-screen layer, role="dialog" aria-modal, focus trap, initial focus, no Esc/backdrop/close, returns focus on unmount; optional `inert` helper for siblings. Props `{ children, label }` — files: `src/ui/components/FullScreenModal.tsx`, `src/ui/components/FullScreenModal.css` (or existing CSS convention), `src/ui/components/index.ts`, `.design-sync/config.json`, `src/ui/components/FullScreenModal.test.tsx` — verify: `renderToString` smoke test (renders label, no close button, `aria-modal`), unit test of the pure focus-cycle helper, `npm test`.
- [ ] 8. [design-sync] `ProgressSegments` (segments done/current/pending + "N из M" counter) and `QuotaDots` (used/limit dots, warn / neg tone) — files: `src/ui/components/ProgressSegments.tsx`, `src/ui/components/QuotaDots.tsx`, `src/ui/components/index.ts`, `.design-sync/config.json`, `src/ui/components/yesterdayParts.test.tsx` (CSS in existing component CSS convention) — verify: `renderToString` smoke tests for both (segment states, dot tones via classes).
- [ ] 9. [design-sync] `SwipeCard` yes/no card: pointer drag (threshold + velocity, snap-back, reduced motion), ArrowLeft/ArrowRight, ✕/✓ buttons, quiet "Не применимо" button, next-card peek slot. Pure `swipeDecision(dx, velocity, width)` helper tested separately — files: `src/ui/components/SwipeCard.tsx`, `src/ui/components/swipe.ts`, `src/ui/components/swipe.test.ts`, `src/ui/components/index.ts`, `.design-sync/config.json` — verify: `swipe.test.ts` (below threshold, over threshold left/right, fling), `renderToString` smoke test of `SwipeCard`.
- [ ] 10. i18n: add all `yr.*` keys to ru/en/uk (plurals via `PluralForms`) per the Spec; mockup error texts — files: `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/uk.ts` — verify: `src/i18n/i18n.test.ts` (key parity / typecheck via `Dict`), `npm test`.
- [ ] 11. Modal screen, stage A + shell: `YesterdayReview` with header (deadline countdown, 30 s refresh), progress, back button, yes/no stage using `SwipeCard`, quota dots for destructive `perWeek` habits, answer state — files: `src/ui/YesterdayReview.tsx`, `src/ui/YesterdayReview.css`, `src/ui/YesterdayReview.test.tsx` — verify: `renderToString` smoke test (first card, header copy with rating > 0 and ≤ 0), manual `npm run dev` swipe/keys/back check.
- [ ] 12. Modal screen, stage B + summary + done: numeric/time cards (`Field`, stepper, errors, goal label, N/A), summary rows (tap to edit single habit), save via `confirmDay` with error handling (`DayLockedError`), done screen from `reviewOutcome` — files: `src/ui/YesterdayReview.tsx`, `src/ui/YesterdayNumeric.tsx`, `src/ui/YesterdayDone.tsx`, `src/ui/YesterdayReview.css`, `src/ui/YesterdayReview.test.tsx` — verify: smoke tests for numeric/time card, summary, done (renderToString), manual save run: replay shows no double credit when later corrected on the "Обзор дня" tab.
- [ ] 13. App wiring: show condition using `shouldShowYesterdayReview` with `lastSyncedAt` (live query of `getSyncState()`), `inert`/`aria-hidden` on app content, close on remote review arrival, re-evaluate on visibility change / midnight, `Review.tsx` min day = yesterday — files: `src/App.tsx`, `src/ui/Review.tsx`, `src/ui/App.test.tsx` (smoke, or extend existing) — verify: `npm test`, `npm run lint`, `npm run build`; manual: fresh sign-in (no modal before first sync, modal after), offline reload keeps working, Esc/backdrop/Tab do nothing outside, confirmed day via tab still editable.
- [ ] 14. Polish and verification pass: `.design-sync/config.json` props match the three new components, HANDOFF/AGENTS Layout mention (`src/ui/YesterdayReview.tsx`) if needed, final `npm test` / `npm run lint` / `npm run build` — files: `.design-sync/config.json`, `AGENTS.md` — verify: all three commands green, verifier role run.
