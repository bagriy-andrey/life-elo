import { supabase } from '../auth/supabase'
import { requestSync } from '../sync/engine'
import type { DayCoverage } from './parse'

export const GARMIN_LIFETIMES = [30, 90, 180, 365] as const
export type GarminLifetime = (typeof GARMIN_LIFETIMES)[number]

const TIMEOUT_MS = 20_000
const THROTTLE_MS = 15 * 60 * 1000

export type GarminStatus =
  | {
      kind: 'connected'
      keyExpiresAt: string | null
      lastPullAt: string | null
      lastAttemptAt: string | null
      lastError: GarminErrorReason | null
    }
  | { kind: 'not_connected' }
  | { kind: 'error' }

export type ConnectResult =
  | { kind: 'connected'; keyExpiresAt: string }
  | { kind: 'key_invalid' }
  | { kind: 'error' }

export type GarminStage = 'token' | 'garmin' | 'db' | 'unknown'
/** Server stage of the last failure; `key_invalid` is also possible in the status. */
export type GarminErrorReason = GarminStage | 'key_invalid'

export type PullResult =
  | { kind: 'ok'; lastPullAt: string; deviceLastSyncAt?: string; coverage: Record<string, DayCoverage> }
  | { kind: 'error'; stage: GarminStage }
  | { kind: 'key_invalid' }
  | { kind: 'not_connected' }
  | { kind: 'throttled' }
  | { kind: 'timeout' }
  | { kind: 'offline' }

const STAGES: readonly string[] = ['token', 'garmin', 'db', 'unknown']
const asStage = (v: unknown): GarminStage => (typeof v === 'string' && STAGES.includes(v) ? (v as GarminStage) : 'unknown')
const asReason = (v: unknown): GarminErrorReason | null =>
  v === 'key_invalid' ? 'key_invalid' : typeof v === 'string' && STAGES.includes(v) ? (v as GarminStage) : null

type Reply = { ok: boolean; body: Record<string, unknown> | null }
const TIMED_OUT = 'timeout' as const

/** Calls an Edge Function; never throws. Times out after 20 s (aborted + raced; resolves 'timeout'). Response bodies of 4xx are returned too. */
async function call(name: string, method: 'GET' | 'POST' | 'DELETE', body?: unknown): Promise<Reply | typeof TIMED_OUT | null> {
  if (!supabase) return null
  const client = supabase
  const ctrl = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => {
      ctrl.abort()
      resolve(TIMED_OUT)
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
  if (r === TIMED_OUT || !r?.ok || !r.body) return { kind: 'error' }
  if (!r.body.connected) return { kind: 'not_connected' }
  return {
    kind: 'connected',
    keyExpiresAt: (r.body.keyExpiresAt as string | null) ?? null,
    lastPullAt: (r.body.lastPullAt as string | null) ?? null,
    lastAttemptAt: (r.body.lastAttemptAt as string | null) ?? null,
    lastError: asReason(r.body.lastError),
  }
}

export async function connect(key: string, lifetimeDays: GarminLifetime): Promise<ConnectResult> {
  const r = await call('garmin-connect', 'POST', { key, lifetimeDays })
  if (r === TIMED_OUT) return { kind: 'error' }
  if (r?.ok && r.body?.status === 'connected' && typeof r.body.keyExpiresAt === 'string') {
    return { kind: 'connected', keyExpiresAt: r.body.keyExpiresAt }
  }
  if (r?.body?.status === 'key_invalid') return { kind: 'key_invalid' }
  return { kind: 'error' }
}

export async function disconnect(): Promise<'ok' | 'error'> {
  const r = await call('garmin-connect', 'DELETE')
  return r !== TIMED_OUT && r?.ok ? 'ok' : 'error'
}

const lastPull = new Map<string, number>()
/** Test hook: forget the per-range throttle. */
export function resetGarminThrottle(): void {
  lastPull.clear()
}

/**
 * Asks the server to fetch `from..to` (<= 7 days); on success a normal sync pull lands the rows in Dexie.
 * Throttled per range to once per 15 min unless `force`. Never throws.
 */
export async function pull(from: string, to: string, opts: { force?: boolean } = {}): Promise<PullResult> {
  const k = `${from}/${to}`
  const at = lastPull.get(k)
  if (!opts.force && at !== undefined && Date.now() - at < THROTTLE_MS) return { kind: 'throttled' }
  const r = await call('garmin-pull', 'POST', { from, to })
  if (r === TIMED_OUT) return { kind: 'timeout' }
  const s = r?.body?.status
  if (!r || (!r.ok && s === undefined)) return { kind: 'offline' }
  if (s === 'ok') {
    lastPull.set(k, Date.now())
    void requestSync()
    const dls = r.body?.deviceLastSyncAt
    return {
      kind: 'ok',
      lastPullAt: typeof r.body?.lastPullAt === 'string' ? r.body.lastPullAt : new Date().toISOString(),
      ...(typeof dls === 'string' ? { deviceLastSyncAt: dls } : {}),
      coverage: (r.body?.coverage as Record<string, DayCoverage> | undefined) ?? {},
    }
  }
  if (s === 'not_connected' || s === 'key_invalid') return { kind: s }
  if (s === 'error') return { kind: 'error', stage: asStage(r.body?.stage) }
  return { kind: 'error', stage: 'unknown' }
}
