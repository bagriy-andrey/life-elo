import { describe, expect, it } from 'vitest'
import type { Zone } from '../domain/types'
import { RULESET_V1 as cfg } from './config'
import { EMPTY_STREAK, advanceStreak, breakStreak, isRecovery, negativeMultiplier } from './streaks'


function step(state = EMPTY_STREAK, zone: Zone) {
  return advanceStreak(state, zone, cfg)
}

describe('advanceStreak', () => {
  it('excellent and ok add to the positive streak', () => {
    let s = step(EMPTY_STREAK, 'excellent')
    s = step(s, 'ok')
    expect(s).toEqual({ pos: 2, neg: 0 })
  })

  it('tolerable halves with floor and resets negative', () => {
    expect(step({ pos: 7, neg: 0 }, 'tolerable').pos).toBe(3)
    expect(step({ pos: 1, neg: 0 }, 'tolerable').pos).toBe(0)
    expect(step({ pos: 4, neg: 2 }, 'tolerable')).toEqual({ pos: 2, neg: 0 })
  })

  it('bad adds a negative and resets positive', () => {
    expect(step({ pos: 5, neg: 0 }, 'bad')).toEqual({ pos: 0, neg: 1 })
    expect(step({ pos: 0, neg: 1 }, 'bad')).toEqual({ pos: 0, neg: 2 })
  })

  it('a non-bad day ends the bad run', () => {
    expect(step({ pos: 0, neg: 3 }, 'ok')).toEqual({ pos: 1, neg: 0 })
  })

  it('unknown breaks everything', () => {
    expect(breakStreak()).toEqual({ pos: 0, neg: 0 })
  })
})

describe('negativeMultiplier / isRecovery', () => {
  it('bad,bad,bad,bad gives 1, 1.25, 1.5, 1.5', () => {
    let s = EMPTY_STREAK
    const mults: number[] = []
    for (let i = 0; i < 4; i++) {
      s = step(s, 'bad')
      mults.push(negativeMultiplier(s.neg, cfg))
    }
    expect(mults).toEqual([1, 1.25, 1.5, 1.5])
  })

  it('recovery needs two prior bad days, and only the first ok day gets it', () => {
    let s = EMPTY_STREAK
    s = step(s, 'bad')
    expect(isRecovery(s, cfg)).toBe(false)
    s = step(s, 'bad')
    expect(isRecovery(s, cfg)).toBe(true)
    s = step(s, 'ok')
    expect(isRecovery(s, cfg)).toBe(false)
  })
})

describe('advanceStreak extra cases', () => {
  it('excellent resets neg while pos > 0', () => {
    expect(step({ pos: 3, neg: 2 }, 'excellent')).toEqual({ pos: 4, neg: 0 })
  })

  it('tolerable followed by bad', () => {
    const s = step({ pos: 7, neg: 0 }, 'tolerable')
    expect(step(s, 'bad')).toEqual({ pos: 0, neg: 1 })
  })
})
