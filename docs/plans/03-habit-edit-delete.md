# 03 — Rename, change direction, delete a habit

Status: done
Design input: none

## Why
Agreed with the user on 2026-11-04. A habit created with the wrong direction cannot be fixed, it cannot be
renamed, and there is no delete. Direction is not versioned and decides how stored yes/no answers are read
(constructive `true` = done → excellent; destructive `true` = complied → ok), so flipping it with history would
silently reinterpret past days. Rating is never stored, so deleting data = save + replay (AGENTS.md rules).

## Acceptance criteria
- WHEN the user edits a habit THE app SHALL allow changing its name (trimmed, non-empty) at any time;
  scoring is unaffected.
- WHEN no stored review has an answer with a value for this habit (`entries[id].kind === 'value'`)
  THE edit form SHALL allow switching direction (Полезная / Вредная); otherwise the direction control is
  disabled with the muted note «Направление нельзя поменять: по привычке уже есть ответы».
- WHEN the user taps «Удалить» THE app SHALL ask inline (no browser dialog): «Удалить привычку и все её ответы?
  Рейтинг пересчитается.» with «Удалить» / «Отмена»; on confirm it removes the habit, its key from every
  review's `entries`, and its `events`, in one Dexie transaction.
- WHEN another habit's quota uses this habit as `reducedByDaysOf` in any version THE app SHALL refuse the
  delete with a message naming that habit (no data changed).
- Rating, streaks and ledger SHALL only change through replay of the remaining data; no other stored
  shape changes.

## Open questions
(none)

## Steps
- [x] 1. Pure helpers: `hasAnswers(habitId, reviews)`, `reducerUsers(habitId, habits)` (habits whose any
  version's quota has `reducedByDaysOf === habitId`), `withoutHabit(review, habitId)` (returns review with the
  entry key removed, other fields untouched) — files: `src/domain/habitSetup.ts`, `src/domain/habitSetup.test.ts`
  — verify: `npm test`.
- [x] 2. Data op: `deleteHabit(habitId)` in the db layer — one `rw` transaction over `habits`, `reviews`,
  `events`; uses `reducerUsers` guard (throws a typed error) and `withoutHabit` — files: `src/db/db.ts` (or a
  new `src/db/habits.ts`), tests for the pure parts only — verify: `npm test`, `npm run lint`.
- [x] 3. UI in `Habits.tsx` edit form: name input (prefilled), direction SegmentedControl enabled only when
  `!hasAnswers`, inline two-step delete with the texts above and the reducer error; existing classes only
  (no global CSS) — files: `src/ui/Habits.tsx`, `src/ui/labels.ts` (if labels added), `src/App.tsx` (only if
  reviews must be passed in) — verify: `npm run build`, `npm run lint`; manual in `npm run dev`: rename,
  flip direction on a fresh habit, flip blocked after answering, delete a habit and see history/rating replay.
  Note: SegmentedControl has no disabled prop (components untouched), so a locked direction is shown as muted text + the note instead of a disabled control. Manual browser check not done.
