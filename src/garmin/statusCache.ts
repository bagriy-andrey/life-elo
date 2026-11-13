import type { GarminStatus } from './api'

/** Per-device cache of the Garmin connection status (localStorage, never synced). */
export const GARMIN_STATUS_KEY = 'life-elo:garmin-status'

export interface GarminStatusCache {
  connected: boolean
  lastPullAt?: string
  deviceLastSyncAt?: string
  keyExpiresAt?: string
}

const str = (v: unknown) => (typeof v === 'string' ? v : undefined)

export function parseStatusCache(raw: string | null): GarminStatusCache | undefined {
  try {
    const d = (raw ? JSON.parse(raw) : null) as Record<string, unknown> | null
    if (!d || typeof d.connected !== 'boolean') return undefined
    const out: GarminStatusCache = { connected: d.connected }
    if (str(d.lastPullAt)) out.lastPullAt = str(d.lastPullAt)
    if (str(d.deviceLastSyncAt)) out.deviceLastSyncAt = str(d.deviceLastSyncAt)
    if (str(d.keyExpiresAt)) out.keyExpiresAt = str(d.keyExpiresAt)
    return out
  } catch {
    return undefined
  }
}

export function loadStatusCache(): GarminStatusCache | undefined {
  try {
    return parseStatusCache(localStorage.getItem(GARMIN_STATUS_KEY))
  } catch {
    return undefined
  }
}

export function saveStatusCache(cache: GarminStatusCache): void {
  try {
    localStorage.setItem(GARMIN_STATUS_KEY, JSON.stringify(cache))
  } catch {
    // storage unavailable: the cache is an optimisation only
  }
}

/** Sign-out and «Удалить все данные». */
export function clearStatusCache(): void {
  try {
    localStorage.removeItem(GARMIN_STATUS_KEY)
  } catch {
    // ignore
  }
}

/** Cache entry for a fresh `status()` answer; `error` yields undefined (keep what is cached). */
export function cacheFromStatus(s: GarminStatus, prev?: GarminStatusCache): GarminStatusCache | undefined {
  if (s.kind === 'error') return undefined
  if (s.kind === 'not_connected') return { connected: false }
  return {
    connected: true,
    ...(s.lastPullAt ? { lastPullAt: s.lastPullAt } : {}),
    ...(prev?.deviceLastSyncAt ? { deviceLastSyncAt: prev.deviceLastSyncAt } : {}),
    ...(s.keyExpiresAt ? { keyExpiresAt: s.keyExpiresAt } : {}),
  }
}
