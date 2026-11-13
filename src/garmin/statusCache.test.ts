import { beforeEach, describe, expect, it } from 'vitest'
import { cacheFromStatus, clearStatusCache, GARMIN_STATUS_KEY, loadStatusCache, parseStatusCache, saveStatusCache } from './statusCache'

const store = new Map<string, string>()
beforeEach(() => {
  store.clear()
  ;(globalThis as unknown as { localStorage: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  }
})

describe('statusCache', () => {
  it('round-trips and clears', () => {
    saveStatusCache({ connected: true, lastPullAt: '2026-11-13T10:00:00Z', keyExpiresAt: '2027-01-01T00:00:00Z' })
    expect(loadStatusCache()).toEqual({ connected: true, lastPullAt: '2026-11-13T10:00:00Z', keyExpiresAt: '2027-01-01T00:00:00Z' })
    clearStatusCache()
    expect(store.has(GARMIN_STATUS_KEY)).toBe(false)
    expect(loadStatusCache()).toBeUndefined()
  })
  it('ignores junk', () => {
    expect(parseStatusCache('nope')).toBeUndefined()
    expect(parseStatusCache('{"connected":1}')).toBeUndefined()
    expect(parseStatusCache(null)).toBeUndefined()
    expect(parseStatusCache('{"connected":true,"lastPullAt":5}')).toEqual({ connected: true })
  })
  it('maps status answers; error keeps the cache', () => {
    expect(cacheFromStatus({ kind: 'error' })).toBeUndefined()
    expect(cacheFromStatus({ kind: 'not_connected' })).toEqual({ connected: false })
    expect(
      cacheFromStatus(
        { kind: 'connected', keyExpiresAt: null, lastPullAt: 'x', lastAttemptAt: null, lastError: null },
        { connected: true, deviceLastSyncAt: 'd' },
      ),
    ).toEqual({ connected: true, lastPullAt: 'x', deviceLastSyncAt: 'd' })
  })
})
