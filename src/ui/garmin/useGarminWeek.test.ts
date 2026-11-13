import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PullResult } from '../../garmin/api'
import { GARMIN_STATUS_KEY } from '../../garmin/statusCache'
import { backfillWeek, weekBackfillRange, weekKeys } from './useGarminWeek'

describe('weekKeys', () => {
  it('starts on Monday', () => {
    expect(weekKeys('2026-11-13')).toEqual(['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'])
    expect(weekKeys('2026-11-15')[0]).toBe('2026-11-09')
    expect(weekKeys('2026-11-09')[0]).toBe('2026-11-09')
  })
  it('rolls over month and year', () => {
    expect(weekKeys('2026-11-01')[0]).toBe('2026-10-26')
    expect(weekKeys('2026-11-01')[6]).toBe('2026-11-01')
    expect(weekKeys('2027-01-01')).toEqual(['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03'])
  })
})

describe('weekBackfillRange', () => {
  it('Monday..today for the current week, Monday..Sunday for past weeks, <= 7 days', () => {
    expect(weekBackfillRange('2026-11-11', '2026-11-13')).toEqual({ from: '2026-11-09', to: '2026-11-13' })
    expect(weekBackfillRange('2026-11-03', '2026-11-13')).toEqual({ from: '2026-11-02', to: '2026-11-08' })
    const r = weekBackfillRange('2026-12-30', '2027-02-01')!
    expect(r).toEqual({ from: '2026-12-28', to: '2027-01-03' })
    expect((Date.parse(r.to) - Date.parse(r.from)) / 86_400_000).toBeLessThanOrEqual(6)
  })
  it('none for a week fully in the future', () => {
    expect(weekBackfillRange('2026-11-20', '2026-11-13')).toBeUndefined()
  })
})

describe('backfillWeek', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    })
  })
  it('pulls the week range once and stores the device sync time', async () => {
    const pull = vi.fn(async (): Promise<PullResult> => ({ kind: 'ok', lastPullAt: 'x', deviceLastSyncAt: '2026-11-13T10:57:00.000Z', coverage: {} }))
    const c = await backfillWeek('2026-11-12', '2026-11-13', pull)
    expect(pull).toHaveBeenCalledTimes(1)
    expect(pull).toHaveBeenCalledWith('2026-11-09', '2026-11-13')
    expect(c?.deviceLastSyncAt).toBe('2026-11-13T10:57:00.000Z')
    expect(JSON.parse(localStorage.getItem(GARMIN_STATUS_KEY)!).deviceLastSyncAt).toBe('2026-11-13T10:57:00.000Z')
  })
  it('keeps the cached fields and ignores throttled, error and throwing pulls', async () => {
    localStorage.setItem(GARMIN_STATUS_KEY, JSON.stringify({ connected: true, lastPullAt: 'p' }))
    expect(await backfillWeek('2026-11-12', '2026-11-13', async () => ({ kind: 'throttled' }))).toBeUndefined()
    expect(await backfillWeek('2026-11-12', '2026-11-13', async () => ({ kind: 'error', stage: 'garmin' }))).toBeUndefined()
    expect(await backfillWeek('2026-11-12', '2026-11-13', async () => { throw new Error('x') })).toBeUndefined()
    expect(JSON.parse(localStorage.getItem(GARMIN_STATUS_KEY)!)).toEqual({ connected: true, lastPullAt: 'p' })
    const ok = await backfillWeek('2026-11-12', '2026-11-13', async () => ({ kind: 'ok', lastPullAt: 'q', deviceLastSyncAt: 'd', coverage: {} }))
    expect(ok).toEqual({ connected: true, lastPullAt: 'p', deviceLastSyncAt: 'd' })
  })
  it('does not call pull for a future week', async () => {
    const pull = vi.fn()
    await backfillWeek('2026-11-20', '2026-11-13', pull)
    expect(pull).not.toHaveBeenCalled()
  })
})
