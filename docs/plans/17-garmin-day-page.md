# 17 — Garmin day page (all data, sections + charts)

Status: approved
Design input: none

## Why
The user wants every Garmin metric for a day (2026-11-13): tapping a day card in «Данные Garmin» (plan 16)
opens a page with all data. Spike: `docs/specs/13-garmin.md` «All endpoints (2026-11-13)».
User decisions (2026-11-13): **store** the full sanitized day data with us (instant, offline, history for future
analytics) and show **sections + charts**. Read-only; Elo untouched (AGENTS.md: Garmin only prefills).

## Acceptance criteria
- WHEN a day card in «Данные Garmin» is tapped THE app SHALL open `/garmin/:day` (sheet closes; «Назад» returns).
- THE page SHALL show, when present, sections:
  - **Активность** — steps/goal/distance, floors up/down, calories (resting/active/total), intensity minutes
    (moderate/vigorous/goal);
  - **Пульс** — resting/min/max/7-day resting avg + **line chart** of the day curve (2-min points);
  - **HRV** — last-night avg, weekly avg, 5-min high, status, baseline band + **line chart** of the night series
    with the baseline band;
  - **Стресс** — avg/max, qualifier, durations per level as a **stacked bar**;
  - **Body Battery** — min/max/charged/drained, events list (sleep/activity/recovery with impact);
  - **Сон** — duration, stages as a **stacked bar** (deep/light/REM/awake), score + 7 sub-scores with qualifiers,
    avg HR/stress/SpO2/respiration, awake count, sleep need, naps;
  - **Дыхание и SpO2** — avg/min/max, hourly SpO2 averages (bar chart);
  - **Тренировки** — per activity: type, duration, distance, calories, avg/max HR, training effect/load,
    **HR zones stacked bar**, body battery diff, strength sets/reps/volume/max weight;
  - **Прочее** — water (if any), fitness age;
  - **Все поля** (collapsed) — the full sanitized day data as a readable key → value tree, so nothing is hidden.
- Missing sections are omitted; a day with only the plan-13 summary shows what it has + «Подробных данных нет —
  синхронизируйте снова».
- Stored data contains no personal identifiers (strip list in the spec: profile/user ids, uuids, deviceId, owner*
  fields, `metadataDTO.userInfoDto`, `displayName`, any lat/lon/polyline) — enforced by a recursive strip + test.
- Charts: SVG, tokens only, readable in light/dark, work at 375 px, no new `src/ui/components/**` (screen-local
  chart files under `src/ui/garmin/`, following `src/ui/habit/*Chart*` patterns). Load the `dataviz` skill first.

## Open questions
(none)

## Decisions
- **Storage:** new records table `garmin_detail` (key = DayKey, data = sanitized detail object per day,
  ~45 KB) written only by `garmin-pull` via the existing RPC generalised to `p_tbl in ('garmin','garmin_detail')`.
  The RPC skips rows whose data is unchanged (`where r.data is distinct from excluded.data`) so repeated pulls don't
  bump `rev` and re-download unchanged days. Detail rows use **record schema 5** (old v5 clients skip the unknown
  table without stopping sync), while the client adds Dexie **v6** with a `garminDetail` table (pull-only, never
  pushed, wiped like other account data).
- **Fetching:** `garmin-pull` additionally fetches per date: `dailyHeartRate`, HRV (daily), `spo2acclimation`,
  body battery report, stress daily (only if it adds fields beyond summaries — else skip); range calls stay single;
  everything in parallel. Detail is built per day from: daily summary, sleep, HR, HRV, SpO2, body battery,
  activities of that day (+ activity detail only if the spike showed extra fields — it did not; skip).
- **Shape:** `GarminDetail = { summary?, sleep?, heartRate?, hrv?, spo2?, bodyBattery?, activities?: [] }` holding
  the sanitized Garmin objects (not re-modelled) + a pure view-model `garminDayDetailView(detail, row?)` that
  extracts section values with units; unknown fields still appear in «Все поля».
- Version `0.17.0`.

## Steps
- [x] 1. Fixtures + pure server-side builder: trimmed anonymised fixtures for HR, HRV, SpO2, body battery, full
  daily summary, full sleep, activity (from the spike's endpoints, re-fetched with the key; strip identifiers);
  `src/garmin/detail.ts`: `stripPrivate(obj)` (recursive, strip list) and `buildDetail(raw, day)` → GarminDetail;
  tests (no identifiers survive; per-day split of activities) — files: `src/garmin/detail.ts`, `src/garmin/detail.test.ts`,
  `src/garmin/fixtures/*.json`, `src/domain/types.ts` (`GarminDetail`) — verify: `npm test`.
  Note: fixtures reuse the 2026-11-12 spike responses (stress daily skipped: subset of summaries); `activityName` and sleep `id` also stripped; the lat/lon rule is word-bounded so `latestSpO2` survives.
- [ ] 2. Server: migration `supabase/migrations/20261113020000_garmin_detail.sql` (tbl check adds `garmin_detail`;
  records insert/update policies and `push_records` also exclude it; RPC `garmin_upsert_records` gains `p_tbl`
  validated to the two values + unchanged-skip); `garmin-pull` fetches the extra endpoints and upserts detail rows
  (same stage tagging) — files: the migration, `supabase/functions/garmin-pull/index.ts`, `_shared/garmin.ts` —
  verify: verifier review; the user runs `npx supabase db push --remote --yes` and
  `npx supabase functions deploy garmin-pull --yes` (any time: schema-5 detail rows are skipped by old clients);
  smoke + read-only schema check.
- [x] 3. Client data: Dexie v6 `garminDetail` table; sync pulls `garmin_detail` (pull-only), wipe/logout clear it;
  engine + wipe tests — files: `src/db/db.ts`, `src/sync/engine.ts`, `src/sync/outbox.ts`, `src/sync/wipe.ts`,
  tests — verify: `npm test`.
- [x] 4. View-model + i18n: `garminDayDetailView` (sections with labelled values/units, chart series arrays, HR
  zones, sleep stages, stress durations) + tests; all i18n keys (ru/en/uk) for the page — files:
  `src/garmin/detailView.ts`, `src/garmin/detailView.test.ts`, `src/i18n/{ru,en,uk}.ts` — verify: `npm test`.
- [x] 5. Charts (load `dataviz` skill): screen-local `LineSeriesChart` (time series with optional band) and
  `StackedBar` (segments with legend) under `src/ui/garmin/` + CSS + tests — files: `src/ui/garmin/LineSeriesChart.tsx`,
  `src/ui/garmin/StackedBar.tsx`, their `.css` and `.test.tsx` — verify: renderToString tests; light/dark tokens.
- [ ] 6. Page `/garmin/:day` (route in `src/ui/route.ts`), sections, «Все поля» tree, back navigation; day cards in
  `GarminDataSheet` become buttons that navigate — files: `src/ui/GarminDayPage.tsx`, `.css`, `.test.tsx`,
  `src/ui/route.ts`, `src/App.tsx`, `src/ui/GarminDataSheet.tsx` — verify: smoke tests (full detail, summary-only,
  empty); manual 375 px light/dark.
- [ ] 7. Docs + version: `docs/setup/backend.md` (detail table, endpoints, size), AGENTS.md Layout line if needed,
  `chore: version 0.17.0` — verify: `npm test`, `npm run lint`, `npm run build`.
