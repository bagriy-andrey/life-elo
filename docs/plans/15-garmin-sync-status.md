# 15 — Garmin sync status (profile + morning review) and sync triggers

Status: approved
Design input: none

## Why
After plan 13 the user connected Garmin (2026-11-11) but «Синхронизации ещё не было» two days later and the
review shows no prefill. The only trigger is opening the review; failures are silent (5 s client timeout, no
status anywhere). The user asked (2026-11-13): show the last sync time in Профиль and a sync status in the
morning review — loaded / not loaded — and account for the watch not having synced to Garmin yet: a pull can
succeed while yesterday's data is missing or partial. Plan 14 (Vault) is merged but not applied; it rolls out here.

## Acceptance criteria
- THE review SHALL show a compact Garmin status line (only when Garmin is connected and the day is unconfirmed):
  - `loading` — «Загружаем данные Garmin…»;
  - `complete` — «Данные Garmin за вчера загружены»;
  - `partial` — pull ok, yesterday has some data but the watch hasn't synced since yesterday ended
    → «Данные за вчера могут быть неполными: синхронизируйте часы с Garmin Connect и нажмите «Обновить»»;
  - `no_data` — pull ok, nothing for yesterday → «Garmin ещё не прислал данные за вчера: синхронизируйте часы…»;
  - `error` / `key_invalid` — short reason; all non-complete states have «Обновить» (force pull, bypasses throttle).
- «Complete» rule: the watch's last sync to Garmin is after the end of yesterday (local). Source: a Garmin
  last-sync timestamp if the API exposes one (step 1 decides); fallback: a sleep record dated today exists.
- THE profile SHALL show: last successful sync time, last attempt time + error when the last attempt failed,
  and «Синхронизировать сейчас» (pulls the last 7 days). Status load failure shows «Повторить», not a dead end.
- Triggers: review open (as now); right after connecting (last 7 days); app start / return to foreground,
  throttled to once per 15 min. Client timeout 20 s; the review never blocks on it.
- Server failures are diagnosable: `garmin-pull` records `last_attempt_at` + `last_error` (stage name only:
  `token` | `garmin` | `db` | `unknown`, never secrets) and returns `{ status: 'error', stage }`.
- Plan 14 (Vault) is applied in the same rollout; nothing about scoring changes (prefill only).

## Open questions
(none)

## Decisions
- `garmin-pull` ok response: `{ status: 'ok', lastPullAt, deviceLastSyncAt?: ISO, coverage: { [day]: { steps: boolean,
  sleep: boolean, activities: number } } }`. Coverage is computed from the parsed `GarminDay`s.
- Pure `reviewGarminStatus({ pull, day, today, deviceLastSyncAt, rows })` in `src/domain/` decides the review state.
- New migration after `20261111010000_garmin_vault.sql`: columns `last_attempt_at timestamptz`, `last_error text`.
- Version `0.15.0` (plan 14 rides along; its boxes are checked when applied here).

## Steps
- [x] 1. Spike (key in `.env.local`, never printed): does any Personal API endpoint expose the device's last sync
  to Garmin (e.g. a `lastSyncTimestampGMT` in `usersummary-service` daily summary, or a device endpoint)?
  Record field + endpoint in `docs/specs/13-garmin.md` (new section), add a trimmed anonymised fixture —
  files: `docs/specs/13-garmin.md`, `src/garmin/fixtures/` — verify: findings in the spec.
  Result: no device endpoint; proxy = `dailysummaries[].wellnessChronology.endTimestampGmt` of today (see spec).
- [ ] 2. Server: migration `supabase/migrations/20261113000000_garmin_status.sql` (columns above);
  `garmin-pull` returns coverage + `deviceLastSyncAt`, writes `last_attempt_at`/`last_error` (stage) on every
  attempt and `last_pull_at` on success; `garmin-connect` GET also returns `lastAttemptAt`, `lastError`;
  stage-tagged logging (stage name only). Includes the plan-14 Vault code already on main — files: the migration,
  `supabase/functions/_shared/garmin.ts`, `garmin-pull/index.ts`, `garmin-connect/index.ts`, `src/garmin/parse.ts`
  (coverage helper) + test — verify: verifier review; then the user runs
  `npx supabase db push --remote --yes` and `npx supabase functions deploy garmin-connect garmin-pull --yes`;
  smoke (401 without user) and read-only schema check.
- [x] 3. Client logic: `src/garmin/api.ts` (20 s timeout, `pull(from, to, { force })`, ok result carries coverage +
  deviceLastSyncAt, error carries stage; status carries lastAttemptAt/lastError), `reviewGarminStatus` in
  `src/domain/garminStatus.ts` + tests, triggers: after connect (7 days) and app start/foreground (throttled) —
  files: `src/garmin/api.ts`, `src/garmin/api.test.ts`, `src/domain/garminStatus.ts`, `src/domain/garminStatus.test.ts`,
  `src/App.tsx`, `src/i18n/{ru,en,uk}.ts` (all new keys for steps 4–5) — verify: `npm test`.
  Note: connect-trigger lives in Profile.doConnect (force pull of 7 days); reviewGarminStatus takes `rows` (no separate deviceLastSyncAt, it is in the pull result) and returns `{state, reason?}`.
- [x] 4. Review status line + «Обновить» — files: `src/ui/YesterdayReview.tsx`, `src/ui/YesterdayReview.css`,
  `src/ui/YesterdayReview.test.tsx` — verify: smoke tests per state; existing components only.
- [x] 5. Profile: last sync / last attempt + error / «Синхронизировать сейчас» / «Повторить» — files:
  `src/ui/Profile.tsx`, `src/ui/Profile.test.tsx` — verify: smoke tests.
- [ ] 6. Docs + version: `docs/setup/backend.md` (status columns, triggers), plan 14 boxes checked + `Status: done`,
  `chore: version 0.15.0` — verify: `npm test`, `npm run lint`, `npm run build`.
