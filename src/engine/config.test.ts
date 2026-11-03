import { describe, expect, it } from 'vitest'
import { RULESET_V1 } from './config'

describe('RULESET_V1 (LIFE_ELO_PRODUCT_CONTEXT.md §6.5)', () => {
  it('uses the agreed numbers literally', () => {
    expect(RULESET_V1.version).toBe('v1')
    expect(RULESET_V1.tierWeight).toEqual({ weak: 1, medium: 2, strong: 3 })
    expect(RULESET_V1.budget).toEqual({ habitBase: 60, cleanDay: 20, streak: 20 })
    expect(RULESET_V1.zoneShare).toEqual({ excellent: 1, ok: 0.5, tolerable: 0, bad: -1 })
    expect(RULESET_V1.streakFullDays).toBe(7)
    expect(RULESET_V1.softDecayFactor).toBe(0.5)
    expect(RULESET_V1.recoveryMinBadDays).toBe(2)
    expect(RULESET_V1.negativeMultipliers).toEqual([1, 1.25, 1.5])
    expect(RULESET_V1.dayClamp).toBe(100)
    expect(RULESET_V1.eloRate).toBe(0.1)
    expect(RULESET_V1.eloScale).toBe(10)
    expect(RULESET_V1.reviewWindowDays).toBe(1)
  })

  it('budget sums to 100', () => {
    const { habitBase, cleanDay, streak } = RULESET_V1.budget
    expect(habitBase + cleanDay + streak).toBe(100)
    expect(RULESET_V1.dayClamp).toBe(habitBase + cleanDay + streak)
  })
})
