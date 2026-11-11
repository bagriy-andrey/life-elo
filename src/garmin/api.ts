import { supabase } from '../auth/supabase'
import { requestSync } from '../sync/engine'

export const GARMIN_LIFETIMES = [30, 90, 180, 365] as const
export type GarminLifetime = (typeof GARMIN_LIFETIMES)[number]

const TIMEOUT_MS = 5000
const THROTTLE_MS = 15 * 60 * 1000

export type GarminStatus =
  | { kind: 'connected'; keyExpiresAt: string | null; lastPullAt: string | null }
  | { kind: 'not_connected' }
  | { kind: 'error' }

export type ConnectResult =
  | { kind: 'connected'; keyExpiresAt: string }
  | { kind: 'key_invalid' }
  | { kind: 'error' }

export type PullResult = 'ok' | 'not_connected' | 'key_invalid' | 'throttled' | 'error'

type Reply = { ok: boolean; body: Record<string, unknown> | null }

/** Calls an Edge Function; never throws. Times out after 5 s (aborted + raced). Response bodies of 4xx are returned too. */
async function call(name: string, method: 'GET' | 'POST' | 'DELETE', body?: unknown): Promise<Reply | null> {
  if (!supabase) return null
  const client = supabase
  const ctrl = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      ctrl.abort()
      resolve(null)
    }, TIMEOUT_MS)
  })
  const request = (async (): Promise<Reply | null> => {
    try {
      const { data, error } = await client.functions.invoke(name, { method, body: body as never, signal: ctrl.signal } as never)
      if (!error) return { ok: true, body: (data as Record<string, unknown> | null) ?? null }
      const res = (error as { context?: unknown }).context
      if (res instanceof Response) return { ok: false, body: await res.json().catch(() => null) }
      return null
    } catch {
      return null
    }
  })()
  try {
    return await Promise.race([request, timeout])
  } finally {
    clearTimeout(timer)
  }
}

export async function status(): Promise<GarminStatus> {
  const r = await call('garmin-connect', 'GET')
  if (!r?.ok || !r.body) return { kind: 'error' }
  if (!r.body.connected) return { kind: 'not_connected' }
  return {
    kind: 'connected',
    keyExpiresAt: (r.body.keyExpiresAt as string | null) ?? null,
    lastPullAt: (r.body.lastPullAt as string | null) ?? null,
  }
}

export async function connect(key: string, lifetimeDays: GarminLifetime): Promise<ConnectResult> {
  const r = await call('garmin-connect', 'POST', { key, lifetimeDays })
  if (r?.ok && r.body?.status === 'connected' && typeof r.body.keyExpiresAt === 'string') {
    return { kind: 'connected', keyExpiresAt: r.body.keyExpiresAt }
  }
  if (r?.body?.status === 'key_invalid') return { kind: 'key_invalid' }
  return { kind: 'error' }
}

export async function disconnect(): Promise<'ok' | 'error'> {
  const r = await call('garmin-connect', 'DELETE')
  return r?.ok ? 'ok' : 'error'
}

const lastPull = new Map<string, number>()
/** Test hook: forget the per-range throttle. */
export function resetGarminThrottle(): void {
  lastPull.clear()
}

/** Asks the server to fetch `from..to` (<= 7 days); on success a normal sync pull lands the rows in Dexie. */
export async function pull(from: string, to: string): Promise<PullResult> {
  const k = `${from}/${to}`
  const at = lastPull.get(k)
  if (at !== undefined && Date.now() - at < THROTTLE_MS) return 'throttled'
  const r = await call('garmin-pull', 'POST', { from, to })
  const s = r?.body?.status
  if (!r || (!r.ok && s === undefined)) return 'error'
  if (s === 'ok') {
    lastPull.set(k, Date.now())
    void requestSync()
    return 'ok'
  }
  if (s === 'not_connected' || s === 'key_invalid') return s
  return 'error'
}
