import postgres from 'npm:postgres@3'
import { parseGarmin } from '../../../src/garmin/parse.ts'
import {
  adminClient,
  corsHeaders,
  daysBetween,
  eachDay,
  exchangeKey,
  garminGet,
  isDayKey,
  json,
  KeyInvalidError,
  userIdFrom,
} from '../_shared/garmin.ts'

/** Client Dexie schema number (db.verno in src/db/db.ts); bump together with new Dexie versions. */
const RECORD_SCHEMA = 5

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
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
      const ex = await exchangeKey(apiKey)
      const { error: saveErr } = await admin.rpc('garmin_save_token', {
        p_user: userId,
        p_token: ex.token,
        p_token_expires_at: ex.expiresAt,
      })
      if (saveErr) throw saveErr
      return ex.token
    }

    const fetchAll = async (tok: string) => {
      const dates = eachDay(from, to)
      const [steps, activities, sleeps] = await Promise.all([
        garminGet(`/usersummary-service/stats/steps/daily/${from}/${to}`, tok),
        garminGet(
          `/activitylist-service/activities/search/activities?start=0&limit=100&startDate=${from}&endDate=${to}`,
          tok,
        ),
        Promise.all(dates.map((d) => garminGet(`/sleep-service/sleep/dailySleep?date=${d}`, tok))),
      ])
      const sleepByDate: Record<string, unknown> = {}
      dates.forEach((d, i) => {
        if (sleeps[i]) sleepByDate[d] = sleeps[i]
      })
      return { steps, activities, sleepByDate }
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
      if (e instanceof KeyInvalidError) return json({ status: 'key_invalid' })
      throw e
    }

    const days = parseGarmin(raw)
    const rows = Object.entries(days)
      .filter(([date]) => date >= from && date <= to)
      .map(([date, data]) => ({ key: date, data }))

    if (rows.length > 0) {
      // One statement under the user's advisory lock, like push_records, so rev order = commit order.
      const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { max: 1, prepare: false })
      try {
        await sql.begin(async (tx) => {
          await tx`select pg_advisory_xact_lock(hashtext(${userId}::text))`
          await tx`
            insert into public.records as r (user_id, tbl, key, data, deleted, schema, client_updated_at, rev)
            select ${userId}::uuid, 'garmin', x.key, x.data, false, ${RECORD_SCHEMA}::int, now(),
                   nextval('public.records_rev_seq')
            from jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) as x(key text, data jsonb)
            on conflict (user_id, tbl, key) do update
              set data = excluded.data, deleted = false, schema = excluded.schema,
                  client_updated_at = excluded.client_updated_at,
                  rev = nextval('public.records_rev_seq')`
        })
      } finally {
        await sql.end({ timeout: 5 })
      }
    }

    await admin
      .from('garmin_credentials')
      .update({ last_pull_at: new Date().toISOString() })
      .eq('user_id', userId)
    return json({ status: 'ok', days: rows.length })
  } catch (e) {
    console.error('garmin-pull failed:', e instanceof Error ? e.name : 'unknown')
    return json({ error: 'internal' }, 500)
  }
})
