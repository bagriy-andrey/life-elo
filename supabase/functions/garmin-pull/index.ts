import { buildDetail, createFailureTracker } from '../../../src/garmin/detail.ts'
import { coverage, deviceLastSyncAt, parseGarmin } from '../../../src/garmin/parse.ts'
import {
  adminClient,
  corsHeaders,
  createLimiter,
  daysBetween,
  eachDay,
  exchangeKey,
  garminGet as garminGetRaw,
  isDayKey,
  json,
  KeyInvalidError,
  userIdFrom,
} from '../_shared/garmin.ts'

/** Client Dexie schema number (db.verno in src/db/db.ts); bump together with new Dexie versions. */
const RECORD_SCHEMA = 5

type Stage = 'token' | 'garmin' | 'db' | 'unknown'

/**
 * POST { from, to } (<= 8 days). Responses (all HTTP 200 unless noted, so supabase-js `invoke` yields the body):
 *   { status: 'ok', lastPullAt, deviceLastSyncAt?, coverage: { [day]: { steps, sleep, activities } } }
 *   { status: 'error', stage: 'token' | 'garmin' | 'db' | 'unknown' }
 *   { status: 'key_invalid' } | { status: 'not_connected' }
 *   401 unauthorized, 400 bad_request / bad_range, 405.
 * Every attempt writes last_attempt_at + last_error (stage or null); success also last_pull_at.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  let stage: Stage = 'unknown'
  try {
    const userId = await userIdFrom(req)
    if (!userId) return json({ error: 'unauthorized' }, 401)

    const body = await req.json().catch(() => null)
    const from = body?.from
    const to = body?.to
    if (!isDayKey(from) || !isDayKey(to)) return json({ error: 'bad_request' }, 400)
    const span = daysBetween(from, to)
    if (span < 0 || span > 7) return json({ error: 'bad_range' }, 400)

    const admin = adminClient()
    const record = async (error: string | null, ok = false): Promise<string> => {
      const now = new Date().toISOString()
      const patch: Record<string, string | null> = { last_attempt_at: now, last_error: error }
      if (ok) patch.last_pull_at = now
      await admin.from('garmin_credentials').update(patch).eq('user_id', userId)
      return now
    }

    const { data: rows0, error: credErr } = await admin.rpc('garmin_get_secrets', { p_user: userId })
    if (credErr) throw credErr
    const cred = (Array.isArray(rows0) ? rows0[0] : rows0) as {
      api_key: string | null
      token: string | null
      token_expires_at: string | null
    } | null
    if (!cred || !cred.api_key) return json({ status: 'not_connected' })
    const apiKey = cred.api_key

    let token: string | null =
      cred.token && cred.token_expires_at && Date.parse(cred.token_expires_at) - Date.now() > 3600_000
        ? cred.token
        : null

    const refresh = async (): Promise<string> => {
      stage = 'token'
      const ex = await exchangeKey(apiKey)
      const { error: saveErr } = await admin.rpc('garmin_save_token', {
        p_user: userId,
        p_token: ex.token,
        p_token_expires_at: ex.expiresAt,
      })
      if (saveErr) throw saveErr
      return ex.token
    }

    // The watch's last upload is read from today's dailysummaries entry. The user's local "today" is unknown here, so
    // query up to max(to, UTC today + 1 day): a day-after bound covers any UTC offset.
    const today = new Date()
    const tomorrowUtc = new Date(today.getTime() + 86400000).toISOString().slice(0, 10)
    const summaryEnd = tomorrowUtc > to ? tomorrowUtc : to

    let failures = createFailureTracker()
    const fetchAll = async (tok: string) => {
      stage = 'garmin'
      failures = createFailureTracker()
      const dates = eachDay(from, to)
      // A failing detail call only drops that part (stage name logged, never bodies); 401/403 still means key_invalid.
      const limit = createLimiter(6)
      const garminGet = (path: string, t: string) => limit(() => garminGetRaw(path, t))
      const optional = async (name: string, path: string, day: string | null): Promise<unknown> => {
        try {
          return await garminGet(path, tok)
        } catch (e) {
          if (e instanceof KeyInvalidError) throw e
          failures.fail(day)
          console.error(`garmin-pull detail ${name} ${e instanceof Error ? e.name : 'unknown'}`)
          return null
        }
      }
      const [steps, activities, summaries, sleeps, hrs, hrvs, spo2s, bodyBattery] = await Promise.all([
        garminGet(`/usersummary-service/stats/steps/daily/${from}/${to}`, tok),
        garminGet(
          `/activitylist-service/activities/search/activities?start=0&limit=100&startDate=${from}&endDate=${to}`,
          tok,
        ),
        garminGet(`/usersummary-service/v2/dailysummaries?startDate=${from}&endDate=${summaryEnd}`, tok),
        Promise.all(dates.map((d) => garminGet(`/sleep-service/sleep/dailySleep?date=${d}`, tok))),
        Promise.all(dates.map((d) => optional('heartRate', `/wellness-service/wellness/dailyHeartRate?date=${d}`, d))),
        Promise.all(dates.map((d) => optional('hrv', `/hrv-service/hrv/${d}`, d))),
        Promise.all(
          dates.map((d) => optional('spo2', `/wellness-service/wellness/daily/spo2acclimation/${d}`, d)),
        ),
        optional('bodyBattery', `/wellness-service/wellness/bodyBattery/reports/daily?startDate=${from}&endDate=${to}`, null),
      ])
      const sleepByDate: Record<string, unknown> = {}
      const hrByDate: Record<string, unknown> = {}
      const hrvByDate: Record<string, unknown> = {}
      const spo2ByDate: Record<string, unknown> = {}
      dates.forEach((d, i) => {
        if (sleeps[i]) sleepByDate[d] = sleeps[i]
        if (hrs[i]) hrByDate[d] = hrs[i]
        if (hrvs[i]) hrvByDate[d] = hrvs[i]
        if (spo2s[i]) spo2ByDate[d] = spo2s[i]
      })
      return { steps, activities, summaries, sleepByDate, hrByDate, hrvByDate, spo2ByDate, bodyBattery }
    }

    let raw
    try {
      try {
        if (!token) token = await refresh()
        raw = await fetchAll(token)
      } catch (e) {
        // A cached token may have been revoked: retry once with a fresh one.
        if (!(e instanceof KeyInvalidError) || token === null) throw e
        raw = await fetchAll(await refresh())
      }
    } catch (e) {
      if (e instanceof KeyInvalidError) {
        await record('key_invalid')
        return json({ status: 'key_invalid' })
      }
      throw e
    }

    const days = parseGarmin(raw)
    const rows = Object.entries(days)
      .filter(([date]) => date >= from && date <= to)
      .map(([date, data]) => ({ key: date, data }))

    const allDates = eachDay(from, to)
    const detailSkipped = allDates.filter((d) => failures.isFailed(d)).length
    const detailRows = allDates
      .filter((d) => !failures.isFailed(d))
      .map((date) => {
        const data = buildDetail(
          {
            summaries: raw.summaries,
            sleep: raw.sleepByDate[date],
            heartRate: raw.hrByDate[date],
            hrv: raw.hrvByDate[date],
            spo2: raw.spo2ByDate[date],
            bodyBattery: raw.bodyBattery,
            activities: raw.activities,
          },
          date,
        )
        return { key: date, data }
      })
      .filter((r) => Object.keys(r.data).length > 0)

    stage = 'db'
    for (const [tbl, list] of [
      ['garmin', rows],
      ['garmin_detail', detailRows],
    ] as const) {
      if (list.length === 0) continue
      const { error: upErr } = await admin.rpc('garmin_upsert_records', {
        p_user: userId,
        p_tbl: tbl,
        p_rows: list,
        p_schema: RECORD_SCHEMA,
      })
      if (upErr) throw upErr
    }

    const lastPullAt = await record(null, true)
    return json({
      status: 'ok',
      lastPullAt,
      deviceLastSyncAt: deviceLastSyncAt(raw.summaries),
      coverage: coverage(days, from, to),
      detailDays: detailRows.length,
      detailSkipped,
    })
  } catch (e) {
    console.error(`garmin-pull failed: ${stage} ${e instanceof Error ? e.name : 'unknown'}`)
    // Best effort: record the failed attempt (stage only, never secrets).
    try {
      const userId = await userIdFrom(req)
      if (userId) {
        await adminClient()
          .from('garmin_credentials')
          .update({ last_attempt_at: new Date().toISOString(), last_error: stage })
          .eq('user_id', userId)
      }
    } catch {
      // ignore
    }
    return json({ status: 'error', stage })
  }
})
