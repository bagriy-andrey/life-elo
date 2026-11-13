// Shared helpers for the Garmin Edge Functions (Deno). Never log keys, tokens or Garmin bodies.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

export const GARMIN_BASE = 'https://personal.connectapi.garmin.com'
const TOKEN_URL = `${GARMIN_BASE}/personalapitoken-service/personal-api/personal-api-key/token`

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** Authenticated user id from the request's JWT, or null. */
export async function userIdFrom(req: Request): Promise<string | null> {
  const auth = req.headers.get('Authorization')
  if (!auth) return null
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  })
  const { data, error } = await client.auth.getUser()
  return error || !data.user ? null : data.user.id
}

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })
}

export class KeyInvalidError extends Error {}

/** Reads `exp` (epoch seconds) from a JWT payload, as an ISO string. */
export function jwtExpiry(jwt: string): string | null {
  try {
    const part = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, '=')))
    return typeof payload.exp === 'number' ? new Date(payload.exp * 1000).toISOString() : null
  } catch {
    return null
  }
}

/** Exchanges a Personal API key for an access token. The body is a raw JWT (text/plain), never JSON. */
export async function exchangeKey(key: string): Promise<{ token: string; expiresAt: string }> {
  const res = await fetch(TOKEN_URL, { method: 'POST', headers: { Authorization: `ApiKey ${key}` } })
  if (res.status === 401 || res.status === 403) throw new KeyInvalidError('key invalid')
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`)
  const token = (await res.text()).trim()
  const expiresAt = jwtExpiry(token)
  if (!token || !expiresAt) throw new Error('token exchange returned an unexpected body')
  return { token, expiresAt }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Runs async tasks with at most `max` in flight. */
export function createLimiter(max: number): <T>(fn: () => Promise<T>) => Promise<T> {
  let active = 0
  const queue: Array<() => void> = []
  // A finished task hands its slot straight to the next waiter, so `active` never exceeds `max`.
  const next = () => {
    const waiter = queue.shift()
    if (waiter) waiter()
    else active--
  }
  return async <T>(fn: () => Promise<T>): Promise<T> => {
    if (active >= max) await new Promise<void>((resolve) => queue.push(resolve))
    else active++
    try {
      return await fn()
    } finally {
      next()
    }
  }
}

/** GET; retries once on 429/503 (Retry-After honoured, backoff 800 ms, capped at 3 s). */
export async function garminGet(path: string, token: string): Promise<unknown> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${GARMIN_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    if (res.status === 401 || res.status === 403) throw new KeyInvalidError('token rejected')
    if ((res.status === 429 || res.status === 503) && attempt === 0) {
      const ra = Number(res.headers.get('Retry-After'))
      await res.body?.cancel()
      await sleep(Math.min(3000, Number.isFinite(ra) && ra > 0 ? ra * 1000 : 800))
      continue
    }
    if (res.status === 204) return null
    if (!res.ok) throw new Error(`garmin ${res.status}`)
    const text = await res.text()
    if (!text.trim()) return null
    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  }
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

export function isDayKey(v: unknown): v is string {
  if (typeof v !== 'string' || !DAY_RE.test(v)) return false
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000)
}

export function eachDay(from: string, to: string): string[] {
  const out: string[] = []
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += 86400000) {
    out.push(new Date(t).toISOString().slice(0, 10))
  }
  return out
}
