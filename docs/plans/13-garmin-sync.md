# 13 — Garmin sync (prefill the yesterday review)

Status: approved
Design input: none

## Why
The user wears a Garmin watch that already knows steps, sleep and workouts. Typing them into the
morning review is busywork. Garmin's **Personal API** (own account only, no approval; key from Garmin
Connect → account settings, lifetime 30 d … 1 y; access token 24 h, no refresh; pull-only, read-only;
non-commercial) lets us fetch them. Docs: https://developer.garmin.com/gc-developer-program/personal/personal-api,
FAQ `…/personal/personal-faq/`, Swagger `…/personal/swagger-docs`, reference client
https://github.com/garmin/connect-personal-api-python.
Product: habits «шаги», «отбой», «подъём», «спорт» (LIFE_ELO_PRODUCT_CONTEXT.md §5, zoned habits §6.5).
No scoring change: Garmin values only **prefill** the review; the user still confirms the day (AGENTS.md rules).

## Acceptance criteria
- WHEN the user pastes a valid Personal API key in Профиль → Garmin THE app SHALL store it server-side only
  (never in Dexie/localStorage), show «Подключено», key expiry and last sync time, and allow «Отключить».
- WHEN the yesterday review opens and Garmin is connected THE app SHALL request a pull for the reviewed
  day and the day after (non-blocking, ≤5 s; on timeout/error the review works as today, no error modal).
- WHEN a habit is linked to a Garmin metric and data exists THE review SHALL start with that answer
  preselected and marked «из Garmin»; the user can change it; nothing is confirmed automatically.
- Mapping (user decisions 2026-11-11):
  - steps → daily total steps of day X;
  - bedtime of day X → sleep start of the night X→X+1 (Garmin dates that sleep X+1);
  - wake-up of day X → sleep end of the night X−1→X (Garmin date X);
  - sport (yes/no) of day X → «yes» if any activity on X has a type from the habit's chosen list
    (types are picked per habit in the habit sheet); no matching activity → no prefill (not «no»).
- WHEN data for a habit is missing (watch not synced, no sleep record) THE card SHALL stay unanswered.
- Key expiry (user decision 2026-11-11, option 2): the API does not expose it, so WHEN connecting THE user SHALL
  pick the key lifetime (30 / 90 / 180 days / 1 year, default 1 year); `key_expires_at = connect time + lifetime`;
  the profile SHALL warn when < 7 days remain and show «Ключ недействителен» after a Garmin 401.
- Garmin data never changes an already confirmed day; editing a past day uses the stored values as hints only.
- «Удалить все данные» SHALL also delete the stored key and all Garmin records (other devices drop them on sync).
- Rating/streaks still derived by replay; Garmin raw records sync like other records; no new tier/coefficient.

## Open questions
(none — mode, metrics, sport-by-type and night attribution decided by the user on 2026-11-11)

## Decisions made by the planner (defaults)
- **Server side = Supabase Edge Functions** (first server code in the project; AGENTS.md «Stack» gets a line).
  The key never reaches the browser after it is saved; CORS of Garmin's API is irrelevant.
- **On-demand pull, no cron.** A 05:00 cron would run before the night's sleep ends; the pull is triggered when
  the review opens (and at most once per 15 min from app start). Auto-confirm is out of scope.
- **Storage:** `records` gets `tbl = 'garmin'`, `key = DayKey` (Garmin calendar date), `data = GarminDay`
  (`{ steps?, sleepStart?: 'HH:MM', sleepEnd?: 'HH:MM', activities: { type, minutes }[] }`, local times of the
  watch). Written only by the Edge Function with the service role (rev from the sequence, same advisory lock);
  the client pulls it like other records but never pushes it. Credentials live in a separate
  `garmin_credentials` table with RLS on and **no** client policies.
- **Habit link** is input metadata, not scoring: optional `Habit.source = { kind: 'garmin', metric: 'steps' |
  'bedtime' | 'wake' | 'activity', activityTypes?: string[] }` on `Habit` (not on `HabitVersion`). Allowed
  metric per rule: `steps` ↔ measured `steps`; `bedtime`/`wake` ↔ measured `time`; `activity` ↔ `boolean`
  constructive. The engine ignores `source`.
- **Times** are formatted `HH:MM` and fed through the existing `classifyZone`/`timeToMinutes` (04:00 wrap).
- **Rollout order:** garmin rows are written with record schema 5 = Dexie v5 (step 6). A client on v4 stops pulling
  («update-app») once such a row exists, so Garmin must not be connected until the v5 build is merged, deployed
  and opened on every device (step 9 docs say so).
- i18n: all new keys (ru source + en + uk) in step 6, so later steps don't touch `src/i18n/*`.

## Steps
- [x] 1. Spike with the user's key (user-assisted): exchange key → token at
  `https://personal.connectapi.garmin.com/personalapitoken-service/personal-api/personal-api-key/token`
  (`Authorization: ApiKey <key>`), confirm base URL and the endpoints for daily steps/summary, daily sleep and
  activity list (Swagger), rate limits if any. Save anonymised responses as fixtures and write the findings
  (URLs, params, field names, time zones of sleep timestamps) — files: `docs/specs/13-garmin.md`,
  `src/garmin/fixtures/{token,steps,sleep,activities}.json` — verify: findings reviewed by the user; key not committed.
- [x] 2. Pure parser: Garmin responses → `GarminDay` per calendar date; activity types normalised to Garmin
  type keys — files: `src/garmin/parse.ts`, `src/garmin/parse.test.ts`, `src/domain/types.ts` (`GarminDay`,
  `HabitSource`) — verify: `npm test` on fixtures (missing sleep, no activities, sleep crossing midnight).
  `parse.ts` has no Deno/Node-only imports (it is reused by the Edge Function).
- [x] 3. Pure prefill: `prefillFromGarmin(habits, day, garminByDay) → Record<habitId, HabitEntry>` with the
  mapping above (bedtime reads `day+1`, wake reads `day`), only for linked + compatible habits —
  files: `src/domain/garminPrefill.ts`, `src/domain/garminPrefill.test.ts` — verify: `npm test`
  (each metric, missing data → absent, type filter, incompatible rule ignored).
- [x] 4. Migration: `records.tbl` check adds `'garmin'`; table `garmin_credentials(user_id pk → auth.users
  on delete cascade, api_key text, key_expires_at, token text, token_expires_at, last_pull_at)` with RLS and no
  policies; `reset_records()` also deletes the caller's `garmin_credentials` row (garmin records are already
  tombstoned by it) — files: `supabase/migrations/20261111000000_garmin.sql` — verify:
  `npx supabase db push --remote`; a signed-in client cannot select `garmin_credentials`.
- [x] 5. Edge Functions (Deno, JWT required): `garmin-connect` (POST `{ key, lifetimeDays }` → validate via token exchange → upsert
  credentials, return expiry; DELETE → remove row), `garmin-pull` (POST `{ from, to }` ≤ 7 days → reuse cached
  token or exchange, fetch, `parse.ts`, upsert `records` rows `tbl='garmin'` under the user's advisory lock,
  update `last_pull_at`; 401 from Garmin → `{ status: 'key_invalid' }`) — files:
  `supabase/functions/garmin-connect/index.ts`, `supabase/functions/garmin-pull/index.ts`,
  `supabase/functions/_shared/garmin.ts`, `supabase/config.toml` — verify: `npx supabase functions deploy`,
  manual curl with a user JWT returns rows; key never appears in responses or logs.
- [x] 6. Client data + i18n: Dexie table `garmin` (new db version), sync engine pulls `tbl='garmin'` into it and
  never queues it in the outbox, wipe/logout clear it; `src/garmin/api.ts` wraps the two functions
  (`connect`, `disconnect`, `pull` with 5 s timeout, 15 min throttle); all i18n keys for steps 7–8 —
  files: `src/db/db.ts`, `src/sync/engine.ts`, `src/sync/wipe.ts`, `src/garmin/api.ts`, `src/i18n/{ru,en,uk}.ts`
  — verify: `npm test` (engine test: garmin rows land in Dexie, are not pushed; wipe clears them).
  Note: also touched `src/sync/outbox.ts` (clearLocalData/applyRemote include `garmin`); `api.pull` triggers sync via `requestSync()` exported from engine.ts (no App.tsx change); Dexie rows are `GarminDay & { day }`.
- [x] 7. Profile → Garmin section (paste key via `PasswordField`, lifetime `Select` 30/90/180/365 days default 365, status, expiry with warning < 7 days,
  «Отключить») and habit sheet «Источник: Garmin» (metric `Select` filtered by the habit rule; activity types
  multi-select for `activity`) — files: `src/ui/Profile.tsx`, `src/ui/Profile.test.tsx`, `src/ui/HabitSheet.tsx`,
  `src/ui/HabitSheet.test.tsx` — verify: `renderToString` smoke tests; manual check at 375 px light/dark.
  Uses existing components only (no `[design-sync]`).
  Note: pure helpers in `src/garmin/ui.ts` (+test); Notice has no warning tone, so the <7-day warning uses the error tone.
- [x] 8. Review prefill: on open, fire `pull(day, day+1)`; when the `garmin` Dexie rows arrive, merge
  `prefillFromGarmin` into `answers` for cards the user hasn't touched; card shows «из Garmin» hint —
  files: `src/ui/YesterdayReview.tsx`, `src/ui/YesterdayReview.css`, `src/ui/YesterdayReview.test.tsx`,
  `src/App.tsx` — verify: smoke test with prefilled answers; manual: offline review still works.
  Note: SwipeCard (components untouched) has no preselect state, so boolean cards show a «из Garmin: <answer>» line and the user still swipes; App.tsx unchanged.
- [x] 9. Docs + version: `docs/setup/backend.md` (deploy functions, `SUPABASE_SERVICE_ROLE_KEY` is provided to
  functions by Supabase), AGENTS.md «Stack»/«Layout» lines for `supabase/functions/` and `src/garmin/`,
  `chore: version 0.13.0` — files: `docs/setup/backend.md`, `AGENTS.md`, `package.json` — verify:
  `npm test`, `npm run lint`, `npm run build`.
  (Note: version bump done separately by build-plan.)
