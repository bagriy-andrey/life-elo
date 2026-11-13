# 13 — Garmin Personal API: spike findings (2026-11-11)

Live-tested with the owner's key. Fixtures: `src/garmin/fixtures/` (anonymised).
Reference client: https://github.com/garmin/connect-personal-api-python (`client.py`, `auth.py`, `constants.py`).

## Base URL and auth
- Base: `https://personal.connectapi.garmin.com`. All data calls are `GET`, header `Accept: application/json`.
- Key to token: `POST /personalapitoken-service/personal-api/personal-api-key/token`, header
  `Authorization: ApiKey <key>` -> `200`, `content-type: text/plain`, **body is the raw JWT** (not JSON, no
  `expires_in` field). Trim the body.
- Expiry: only inside the JWT payload (`exp`, `iat`, epoch seconds; `exp - iat` = 24 h). Decode the middle segment
  (base64url) to read `exp`. The official client re-exchanges when < 1 h remains. No refresh token.
- Data calls: `Authorization: Bearer <jwt>`. Invalid key/token: expect 401 (not exercised on purpose).
- The key's own expiry (30 d..1 y) is NOT exposed by the token response or JWT. Step 5/7 cannot show "key
  expiry" automatically: the user must enter it, or we show only "connected" / key_invalid on 401.

## Endpoints used (all 200 for 2026-11-09..11)
| Need | Request |
|---|---|
| Daily steps (range, inclusive) | `GET /usersummary-service/stats/steps/daily/{from}/{to}` -> array `[{calendarDate, totalSteps, totalDistance, stepGoal}]` (261 B for 3 days) |
| Daily sleep (one date) | `GET /sleep-service/sleep/dailySleep?date=YYYY-MM-DD` -> object |
| Sleep range (alt.) | `GET /sleep-service/sleep/dailySleepSummariesByDate?startDate=&endDate=` -> returned an array of objects with the same fields as dailySleep (not needed; use per-date or this to save calls) |
| Activities | `GET /activitylist-service/activities/search/activities?start=0&limit=20&startDate=&endDate=` -> array |
| Activity type keys | `GET /activity-service/activity/activityTypes/simple` -> `[{key, parent?}]` (153 types) |
| (alt. summary) | `GET /usersummary-service/v2/dailysummaries?startDate=&endDate=` -> `{data:[{calendarDate, movement.steps.value, ...}]}` (9 KB, not needed) |

Dates are `YYYY-MM-DD` calendar dates of the user's local day. Empty days: the steps array still has an entry
(0 steps expected); a date with no sleep record was not observed (all 3 dates had one) — parser must tolerate an
empty body / `null` / missing `sleepStartTimestampGMT` (reference client returns `None` for an empty body).

## Fields we need for GarminDay
- **steps**: `steps[].calendarDate`, `steps[].totalSteps`.
- **sleep** (per `dailySleep` response):
  - `calendarDate` = date the sleep is attributed to = the day you **wake up** (matches the plan: sleep 11-09 evening
    -> 11-10 morning is `calendarDate` 2026-11-10; observed start 11-09 23:39 local under date 2026-11-10).
  - `sleepStartTimestampGMT` / `sleepEndTimestampGMT`: epoch **ms, true UTC**.
  - `sleepStartTimestampLocal` / `sleepEndTimestampLocal`: epoch ms **shifted by the local UTC offset** (local
    wall-clock time encoded as if UTC). Observed `Local - GMT = +3600000` ms. There is **no separate offset
    field**. So the local `HH:MM` = `new Date(local).getUTCHours()/getUTCMinutes()`; no Intl/timezone lookup needed.
    Use the `Local` pair for `sleepStart`/`sleepEnd` (watch local time, per plan).
  - Also present: `sleepTimeSeconds`, `napTimeSeconds`, `sleepWindowConfirmed` (all true here). Naps are not part of
    the start/end window.
  - Sleep may start after midnight (observed 01:16 on its own calendarDate) -> bedtime `HH:MM` can be 00:00-03:59 and
    flows through the existing 04:00 wrap in `timeToMinutes`.
- **activities** (array items): `activityType.typeKey` (string key), `duration` (seconds, float; `elapsedDuration`
  and `movingDuration` also exist - `movingDuration` can be far smaller, e.g. 427 s of a 7564 s padel session, so use
  `duration`), `startTimeLocal` / `startTimeGMT` (strings `"YYYY-MM-DD HH:MM:SS"`, **local wall clock vs GMT**,
  no offset), `beginTimestamp` (epoch ms UTC), `activityId`, `manualActivity`.
  - Attribute an activity to a day by the date part of `startTimeLocal`.
  - The `startDate`/`endDate` filter matched by local start date (a single-day query returned only that day's
    activity).
  - Personal data in raw responses to strip before storing/fixtures: `activityName`, `owner*` (id, display name,
    full name, image URLs), `userProfilePK`, `deviceId`, `activityUUID`, polylines are not in the list response.

## Activity type keys
Seen in the owner's data: `yoga`, `strength_training`, `paddelball` (sic, Garmin's spelling). Full catalogue from
`activityTypes/simple` has 16 parents + 137 children, e.g. parents `running, cycling, walking, swimming,
fitness_equipment, hiking, racket_sports, team_sports, water_sports, winter_sports, other`; children e.g.
`indoor_cardio, hiit, yoga, pilates, strength_training, elliptical, stair_climbing, indoor_cycling, road_biking,
mountain_biking, trail_running, treadmill_running, street_running, casual_walking, lap_swimming, tennis_v2, paddelball,
pickleball, badminton, squash, table_tennis, soccer, basketball, volleyball, meditation, breathwork,
boxing, rock_climbing, bouldering, golf, ...`. Activities carry the **child** key (`activityType.typeKey`) with
`parentTypeId`. Note some keys have `_v2` / `_ws` suffixes (`tennis_v2`, `rowing_v2`, `resort_skiing`).
The list's `activityType` filter only accepts parent keys, so filter client-side by `typeKey` against the habit's list.
Step 7 UI: offer a curated list (child keys, human labels via i18n) plus store raw keys; unknown keys must not break.

## Rate limits
No `x-ratelimit-*` / `retry-after` headers on any response (Cloudflare fronted: `cf-ray`, `server: cloudflare`).
Limits are not documented in the responses; ~12 calls ran back-to-back without 429. Keep pulls throttled as planned.
Responses carry `cache-control: no-cache, no-store, private`.

## CORS
No `access-control-allow-*` headers on GET responses; preflight `OPTIONS` -> **403**. Browser calls are impossible;
server-side (Edge Function) is required, as planned.

## Impact on later steps
- Step 2: token is plain text; sleep/steps/activities are three separate calls -> the parser takes
  `{steps[], sleepByDate{date->response|null}, activities[]}` and builds `GarminDay` per date. Local sleep time via
  UTC getters of the `*Local` epoch ms; activity day = date part of `startTimeLocal`; minutes = `round(duration/60)`.
  Do not use `*GMT` fields for the HH:MM.
- Step 4/5: `token_expires_at` = JWT `exp`. **Key expiry is not obtainable from the API**: `garmin-connect` returns no
  expiry; either drop "expiry/warning < 7 d" from step 7 or let the user pick the key lifetime when connecting
  (decision for the user). Pull range ≤ 7 days = 1 steps call + up to 7 sleep calls + 1 activities call.
- Step 5: handle empty/204/`null` sleep body; map 401 -> `key_invalid`.

## Last sync / data completeness (spike, 2026-11-13, plan 15 step 1)
Live-tested for 2026-11-11..13. Fixture: `src/garmin/fixtures/dailysummary.json` (trimmed, anonymised).

**No endpoint exposes "the watch last synced at"**. The reference client (`garmin_personal_api/client.py`) has no
device endpoint; `device-service/*` and `userprofile/user-settings` -> 404; `userprofile/settings` has no sync field.
The Swagger page is a JS app with no static spec, nothing device-related found there.

**Proxy that works: `wellnessChronology` in `GET /usersummary-service/v2/dailysummaries?startDate=&endDate=`**
(`data[].wellnessChronology`, same window also in `wellness/dailyHeartRate` as `endTimestampGMT`).
- Fields: `startTimestampGmt/Local`, `endTimestampGmt/Local` (strings `YYYY-MM-DDTHH:MM:SS.0`, **no `Z`/offset**: the
  `Gmt` one is UTC, the `Local` one is local wall clock; observed offset +1 h), `totalDurationInMillis`.
- For a finished day the window is the full day: 2026-11-11 `end` = next midnight (`totalDurationInMillis` 86400000).
- For **today** the entry exists and `end` = the **last data point the watch has uploaded** (not "now"): at 12:59 local
  it was `2026-11-13T08:37:00.0` Gmt (`09:37` Local), `totalDurationInMillis` 34620000. So `end` is a lower bound of
  the last sync ("data up to"), accurate to the watch's wellness granularity; it is not the upload time itself.
- Example (anonymised, from the fixture): `{"calendarDate":"2026-11-13","wellnessChronology":{"startTimestampGmt":
  "2026-11-12T23:00:00.0","endTimestampGmt":"2026-11-13T08:37:00.0","endTimestampLocal":"2026-11-13T09:37:00.0",...}}`.
- Today's `steps` is a partial count (40 at that moment) while today's `dailySleep` already existed (sleep is
  synced first thing after waking).

**Rules**
- `deviceLastSyncAt` = parse `endTimestampGmt` (append `Z`) of the latest `calendarDate` returned (query up to today).
  Pull `dailysummaries` for `[from..today]` as one extra call.
- Day X (local) is **complete** when the watch has data past X's end: `deviceLastSyncAt >= end of X` (equivalently
  X's own `endTimestampGmt` equals its day end / `totalDurationInMillis` is a full day, or today's entry has
  `end > today's start`). For yesterday: today's `endTimestampGmt` > today's `startTimestampGmt`.
- Not verifiable here: whether today's entry is absent before the first sync of the day (the watch had synced). If
  it is absent, the latest returned entry (yesterday) has `end` = its own day end only if synced after midnight, so
  treat "no entry for today" as **not complete** (-> `partial`/`no_data`).
- Sleep finality marker: `dailySleep.sleepWindowConfirmationType` = `enhanced_confirmed_final` (and
  `sleepWindowConfirmed: true`) for both 11-12 and 11-13. Fallback rule from the plan (a sleep record dated today
  exists) is consistent with it, since sleep appears right after the morning sync.
- Fallback if `wellnessChronology` is missing/unparsable: sleep record dated today exists -> complete; otherwise not.

**Timing (deployed pull path, from this machine)**: token exchange 1.4 s; steps range (7 d) 1.0 s; `dailySleep`
x2 0.3 s each; activities range 0.3 s; extra `dailysummaries` 0.3 s. Wall time for exchange + steps + 2 sleeps +
activities = **~3 s** (all 200; sequential). A 7-day pull (1 + 1 + 7 + 1 + 1 calls) is ~5 s sequential, so the old 5 s
client timeout is too tight; 20 s is fine, and sleeps should be fetched in parallel.
