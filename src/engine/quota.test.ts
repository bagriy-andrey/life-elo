import { describe, expect, it } from 'vitest'
import type { HabitEntry } from '../domain/types'
import { quotaZone, weeklyQuotaUsage } from './quota'

const n = (value: number | boolean): HabitEntry => ({ kind: 'value', value })
// 2026-11-02 is a Monday.
const MON = '2026-11-02', TUE = '2026-11-03', WED = '2026-11-04', SUN = '2026-11-08', NEXT_MON = '2026-11-09'
const m = { id: 'm', quota: { perDay: 1, perWeek: 2, reducedByDaysOf: 'sex' } }
const plain = { id: 'm', quota: { perDay: 1, perWeek: 2 } }

describe('quotaZone', () => {
  it('no quota or no count -> null', () => {
    expect(quotaZone({ id: 'm' }, MON, { [MON]: { m: n(1) } })).toBeNull()
    expect(quotaZone(plain, MON, { [MON]: { m: { kind: 'unknown' } } })).toBeNull()
    expect(quotaZone(plain, MON, {})).toBeNull()
  })
  it('1/day 2/week: Mon ok, Tue ok, Wed bad', () => {
    const w = { [MON]: { m: n(1) }, [TUE]: { m: n(1) }, [WED]: { m: n(1) } }
    expect(quotaZone(plain, MON, w)).toBe('ok')
    expect(quotaZone(plain, TUE, w)).toBe('ok')
    expect(quotaZone(plain, WED, w)).toBe('bad')
  })
  it('zero count is ok', () => {
    expect(quotaZone(plain, MON, { [MON]: { m: n(0) } })).toBe('ok')
  })
  it('daily limit exceeded -> bad', () => {
    expect(quotaZone(plain, MON, { [MON]: { m: n(2) } })).toBe('bad')
  })
  it('sex on Mon reduces limit to 1: Tue 1 after Mon 1 is bad', () => {
    const w = { [MON]: { m: n(1), sex: n(true) }, [TUE]: { m: n(1) } }
    expect(quotaZone(m, MON, w)).toBe('ok')
    expect(quotaZone(m, TUE, w)).toBe('bad')
  })
  it('later sex does not change earlier days', () => {
    const w = { [MON]: { m: n(1) }, [TUE]: { m: n(1) }, [WED]: { sex: n(true) } }
    expect(quotaZone(m, TUE, w)).toBe('ok')
    expect(quotaZone(m, TUE, { ...w, [WED]: {} })).toBe('ok')
    expect(quotaZone(m, WED, { ...w, [WED]: { sex: n(true), m: n(0) } })).toBe('bad')
  })
  it('reducer floors at 0: any count is bad, zero is ok', () => {
    const w = {
      [MON]: { sex: n(true) },
      [TUE]: { sex: n(2) },
      [WED]: { sex: n(true), m: n(1) },
    }
    expect(quotaZone(m, WED, w)).toBe('bad')
    expect(quotaZone(m, WED, { ...w, [WED]: { sex: n(true), m: n(0) } })).toBe('ok')
  })
  it('week rollover resets', () => {
    const w = { [SUN]: { m: n(1) }, [TUE]: { m: n(1) }, [NEXT_MON]: { m: n(1) } }
    expect(quotaZone(plain, NEXT_MON, w)).toBe('ok')
    expect(quotaZone(plain, SUN, { [MON]: { m: n(1) }, [TUE]: { m: n(1) }, [SUN]: { m: n(1) } })).toBe('bad')
  })
})

describe('weeklyQuotaUsage', () => {
  it('no weekly quota -> null', () => {
    expect(weeklyQuotaUsage({ id: 'm' }, TUE, {})).toBeNull()
    expect(weeklyQuotaUsage({ id: 'm', quota: { perDay: 1 } }, TUE, {})).toBeNull()
  })
  it('Monday: nothing used (previous week not counted)', () => {
    expect(weeklyQuotaUsage(plain, MON, { '2026-11-01': { m: n(1) }, [MON]: { m: n(1) } })).toEqual({ used: 0, limit: 2 })
  })
  it('mid-week counts Mon..day-1 only, not day itself', () => {
    const w = { [MON]: { m: n(1) }, [TUE]: { m: n(1) }, [WED]: { m: n(1) } }
    expect(weeklyQuotaUsage(plain, WED, w)).toEqual({ used: 2, limit: 2 })
    expect(weeklyQuotaUsage(plain, TUE, w)).toEqual({ used: 1, limit: 2 })
  })
  it('reducedByDaysOf lowers the limit', () => {
    const w = { [MON]: { m: n(1), sex: n(true) } }
    expect(weeklyQuotaUsage(m, TUE, w)).toEqual({ used: 1, limit: 1 })
  })
  it('reducer active on day itself lowers the limit, like quotaZone', () => {
    const w = { [MON]: { m: n(1) }, [TUE]: { sex: n(true) } }
    expect(weeklyQuotaUsage(m, TUE, w)).toEqual({ used: 1, limit: 1 })
    expect(quotaZone(m, TUE, { ...w, [TUE]: { sex: n(true), m: n(1) } })).toBe('bad')
  })
  it('limit floors at 0', () => {
    const w = { [MON]: { sex: n(true) }, [TUE]: { sex: n(2) }, [WED]: { sex: n(true) } }
    expect(weeklyQuotaUsage(m, '2026-11-05', w)).toEqual({ used: 0, limit: 0 })
  })
  it('N/A, unknown and missing add nothing; only passed days are read', () => {
    const w = { [MON]: { m: { kind: 'not_applicable' } }, [TUE]: { m: { kind: 'unknown' } } } as const
    expect(weeklyQuotaUsage(plain, WED, w)).toEqual({ used: 0, limit: 2 })
    expect(weeklyQuotaUsage(plain, WED, { [MON]: { m: n(1) } })).toEqual({ used: 1, limit: 2 })
  })
})

describe('destructive yes/no weekly quota (answers 0/1)', () => {
  const yn = { id: 'y', quota: { perWeek: 2 } }
  it('perWeek 2: two yes days ok, third yes day bad, no days before it ok', () => {
    const w = {
      [MON]: { y: n(1) },
      [TUE]: { y: n(0) },
      [WED]: { y: n(1) },
      '2026-11-05': { y: n(1) },
    }
    expect(quotaZone(yn, MON, w)).toBe('ok')
    expect(quotaZone(yn, TUE, w)).toBe('ok')
    expect(quotaZone(yn, WED, w)).toBe('ok')
    expect(quotaZone(yn, '2026-11-05', w)).toBe('bad')
  })
  it('perWeek 0: any yes day is bad', () => {
    expect(quotaZone({ id: 'y', quota: { perWeek: 0 } }, MON, { [MON]: { y: n(1) } })).toBe('bad')
  })
})
