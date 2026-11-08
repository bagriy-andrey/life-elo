import { describe, expect, it } from 'vitest'
import { deadlineShowsRating, nextMidnight, timeLeft } from './reviewDeadline'

describe('nextMidnight', () => {
  it('is the next calendar midnight', () => {
    expect(nextMidnight(new Date(2026, 5, 10, 13, 5))).toEqual(new Date(2026, 5, 11))
  })
  it('at exactly 00:00 moves to the following day', () => {
    expect(nextMidnight(new Date(2026, 5, 10, 0, 0))).toEqual(new Date(2026, 5, 11))
  })
  it('rolls over month and year end', () => {
    expect(nextMidnight(new Date(2026, 0, 31, 22))).toEqual(new Date(2026, 1, 1))
    expect(nextMidnight(new Date(2026, 11, 31, 22))).toEqual(new Date(2027, 0, 1))
  })
})

describe('timeLeft', () => {
  it('floors to 0 h 1 min under a minute', () => {
    expect(timeLeft(new Date(2026, 5, 10, 23, 59, 30))).toEqual({ hours: 0, minutes: 1 })
    expect(timeLeft(new Date(2026, 5, 10, 23, 59, 59, 999))).toEqual({ hours: 0, minutes: 1 })
  })
  it('is 24 h at 00:00 and floors partial minutes', () => {
    expect(timeLeft(new Date(2026, 5, 10, 0, 0))).toEqual({ hours: 24, minutes: 0 })
    expect(timeLeft(new Date(2026, 5, 10, 22, 30, 30))).toEqual({ hours: 1, minutes: 29 })
  })
  it('works across month end', () => {
    expect(timeLeft(new Date(2026, 0, 31, 20, 15))).toEqual({ hours: 3, minutes: 45 })
  })
  it('uses the real next midnight on DST days (never negative)', () => {
    for (const [y, m, d] of [[2026, 9, 25], [2026, 2, 29]] as const) {
      const start = new Date(y, m, d)
      const real = Math.round((nextMidnight(start).getTime() - start.getTime()) / 60000)
      expect(timeLeft(start)).toEqual({ hours: Math.floor(real / 60), minutes: real % 60 })
      const late = new Date(y, m, d, 23, 59, 30)
      expect(timeLeft(late)).toEqual({ hours: 0, minutes: 1 })
    }
  })
})

describe('deadlineShowsRating', () => {
  it('only for rating > 0', () => {
    expect(deadlineShowsRating(1)).toBe(true)
    expect(deadlineShowsRating(0)).toBe(false)
    expect(deadlineShowsRating(-5)).toBe(false)
  })
})
