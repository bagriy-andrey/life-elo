import { describe, expect, it } from 'vitest'
import type { PullResult } from '../garmin/api'
import { reviewGarminStatus } from './garminStatus'
import type { GarminDay } from './types'

const day = '2026-11-12'
const today = '2026-11-13'
const cov = (steps: boolean, sleep: boolean, activities = 0) => ({ steps, sleep, activities })
const ok = (p: Partial<Extract<PullResult, { kind: 'ok' }>> = {}): PullResult => ({
  kind: 'ok',
  lastPullAt: '2026-11-13T08:00:00Z',
  coverage: {},
  ...p,
})
const run = (pull: PullResult | undefined, rows: Record<string, GarminDay> = {}) =>
  reviewGarminStatus({ pull, day, today, rows })
const steps: GarminDay = { steps: 100, activities: [] }
const sleep: GarminDay = { sleepEnd: '07:00', activities: [] }

describe('reviewGarminStatus', () => {
  it('loading until a pull result exists', () => expect(run(undefined)).toEqual({ state: 'loading' }))

  it('maps not_connected and key_invalid', () => {
    expect(run({ kind: 'not_connected' })).toEqual({ state: 'hidden' })
    expect(run({ kind: 'key_invalid' })).toEqual({ state: 'key_invalid' })
  })

  it('carries the error reason', () => {
    expect(run({ kind: 'error', stage: 'garmin' })).toEqual({ state: 'error', reason: 'garmin' })
    expect(run({ kind: 'timeout' })).toEqual({ state: 'error', reason: 'timeout' })
    expect(run({ kind: 'offline' })).toEqual({ state: 'error', reason: 'offline' })
  })

  it('complete: device synced after the start of today and yesterday has data', () => {
    const p = ok({ deviceLastSyncAt: '2026-11-13T06:00:00Z', coverage: { [day]: cov(true, false) } })
    expect(run(p)).toEqual({ state: 'complete' })
  })

  it('partial: yesterday has data but the device last synced before today began', () => {
    const p = ok({ deviceLastSyncAt: '2026-11-12T20:00:00Z', coverage: { [day]: cov(true, false) } })
    expect(run(p)).toEqual({ state: 'partial' })
  })

  it('no_data: ok but nothing for yesterday, even if the device synced', () => {
    const p = ok({ deviceLastSyncAt: '2026-11-13T06:00:00Z', coverage: { [day]: cov(false, false) } })
    expect(run(p)).toEqual({ state: 'no_data' })
    expect(run(ok())).toEqual({ state: 'no_data' })
  })

  it('local midnight edge (compared against the local start of today)', () => {
    const start = new Date(2026, 10, 13).getTime()
    const base = { coverage: { [day]: cov(true, false) } }
    expect(run(ok({ ...base, deviceLastSyncAt: new Date(start).toISOString() }))).toEqual({ state: 'partial' })
    expect(run(ok({ ...base, deviceLastSyncAt: new Date(start + 1000).toISOString() }))).toEqual({ state: 'complete' })
    expect(run(ok({ ...base, deviceLastSyncAt: new Date(start - 1000).toISOString() }))).toEqual({ state: 'partial' })
  })

  it('fallback without a timestamp: sleep dated today + data for yesterday', () => {
    expect(run(ok({ coverage: { [day]: cov(true, false), [today]: cov(false, true) } }))).toEqual({ state: 'complete' })
    expect(run(ok({ coverage: { [day]: cov(true, false), [today]: cov(true, false) } }))).toEqual({ state: 'partial' })
    expect(run(ok({ coverage: { [day]: cov(true, false) } }))).toEqual({ state: 'partial' })
  })

  it('an unparsable timestamp falls back to the sleep rule', () => {
    const p = ok({ deviceLastSyncAt: 'garbage', coverage: { [day]: cov(true, false), [today]: cov(false, true) } })
    expect(run(p)).toEqual({ state: 'complete' })
  })

  it('throttled derives from Dexie rows (like ok without a timestamp)', () => {
    expect(run({ kind: 'throttled' }, { [day]: steps, [today]: sleep })).toEqual({ state: 'complete' })
    expect(run({ kind: 'throttled' }, { [day]: steps })).toEqual({ state: 'partial' })
    expect(run({ kind: 'throttled' }, { [today]: sleep })).toEqual({ state: 'no_data' })
    expect(run({ kind: 'throttled' })).toEqual({ state: 'no_data' })
  })

  it('rows complement coverage for an ok pull', () => {
    expect(run(ok({ deviceLastSyncAt: '2026-11-13T06:00:00Z' }), { [day]: { activities: [{ type: 'yoga', minutes: 30 }] } })).toEqual({
      state: 'complete',
    })
  })
})
