import { describe, expect, it } from 'vitest'
import type { HabitEntry } from '../domain/types'
import { quotaZone } from './quota'

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
