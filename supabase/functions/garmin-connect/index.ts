import { adminClient, corsHeaders, exchangeKey, json, KeyInvalidError, userIdFrom } from '../_shared/garmin.ts'

const LIFETIMES = [30, 90, 180, 365]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const userId = await userIdFrom(req)
    if (!userId) return json({ error: 'unauthorized' }, 401)
    const db = adminClient()

    if (req.method === 'GET') {
      const { data, error } = await db
        .from('garmin_credentials')
        .select('key_expires_at, last_pull_at')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      return json({
        connected: !!data,
        keyExpiresAt: data?.key_expires_at ?? null,
        lastPullAt: data?.last_pull_at ?? null,
      })
    }

    if (req.method === 'DELETE') {
      const { error } = await db.rpc('garmin_delete', { p_user: userId })
      if (error) throw error
      return json({ status: 'disconnected' })
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => null)
      const key = typeof body?.key === 'string' ? body.key.trim() : ''
      const lifetimeDays = body?.lifetimeDays
      if (!key || !LIFETIMES.includes(lifetimeDays)) return json({ error: 'bad_request' }, 400)
      let exchanged
      try {
        exchanged = await exchangeKey(key)
      } catch (e) {
        if (e instanceof KeyInvalidError) return json({ status: 'key_invalid' }, 400)
        throw e
      }
      const keyExpiresAt = new Date(Date.now() + lifetimeDays * 86400000).toISOString()
      const { error } = await db.rpc('garmin_save_key', {
        p_user: userId,
        p_key: key,
        p_key_expires_at: keyExpiresAt,
        p_token: exchanged.token,
        p_token_expires_at: exchanged.expiresAt,
      })
      if (error) throw error
      return json({ status: 'connected', keyExpiresAt })
    }

    return json({ error: 'method_not_allowed' }, 405)
  } catch (e) {
    console.error('garmin-connect failed:', e instanceof Error ? e.name : 'unknown')
    return json({ error: 'internal' }, 500)
  }
})
