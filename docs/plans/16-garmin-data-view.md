# 16 — View synced Garmin data

Status: done
Design input: none

## Why
Sync works after plan 15 (fix 0.15.1). The user wants to see what was synced (2026-11-13): after a sync,
Профиль → Garmin shows «Посмотреть данные синхронизации», which opens a modal with the stored data.
The data is already persisted (server `records` tbl `garmin` → Dexie `garmin`); this plan only displays it.

## Acceptance criteria
- WHEN Garmin is connected and at least one `garmin` row exists THE profile SHALL show «Посмотреть данные
  синхронизации»; it opens a `BottomSheet` (existing component) titled «Данные Garmin».
- THE sheet SHALL list days newest first (last 30 days with rows), each with: date (weekday + date via `Intl`),
  steps, sleep «23:40 → 07:10» (sleep of the night that ended that morning, as Garmin dates it, labelled
  «Сон (ночь на {date})»), activities as «Падел · 126 мин» (type names via the existing `garmin.type.*` keys /
  `humanizeType`); missing values show «—». Header line: last sync time.
- The list updates live when a sync lands new rows (Dexie live query). Empty state text if no rows.
- Read-only; no scoring change; existing components only (no `src/ui/components/**` changes).

## Open questions
(none)

## Steps
- [x] 1. Pure helper `garminDaysView(rows, limit)` (sort, limit, format-agnostic shape) + tests; i18n keys
  (ru/en/uk) — files: `src/garmin/ui.ts`, `src/garmin/ui.test.ts`, `src/i18n/{ru,en,uk}.ts` — verify: `npm test`.
- [x] 2. Profile button + `GarminDataSheet` (BottomSheet, useLiveQuery on `db.garmin`) + CSS in `Profile.css` +
  smoke tests (with rows, empty) — files: `src/ui/GarminDataSheet.tsx`, `src/ui/GarminDataSheet.test.tsx`,
  `src/ui/Profile.tsx`, `src/ui/Profile.css` — verify: renderToString smoke tests; manual 375 px light/dark.
- [x] 3. Version `0.16.0` — verify: `npm test`, `npm run lint`, `npm run build`.
