import { describe, expect, it } from 'vitest'
import type { LedgerEntry } from '../engine/rating'
import { chartGeometry, periodStats, rangeStart, smoothPath } from './homeStats'

function ledgerOf(deltas: number[]): LedgerEntry[] {
  let rating = 0
  return deltas.map((delta, i) => {
    const e: LedgerEntry = {
      day: `2026-01-${String(i + 1).padStart(2, '0')}`,
      rulesetVersion: 'v1', reviewRevision: 1, status: 'reviewed',
      ratingBefore: rating, delta, ratingAfter: rating + delta,
      dayScore: 0, expected: 0, clamped: false, contributions: [],
    }
    rating += delta
    return e
  })
}

describe('rangeStart', () => {
  it('shows the last 10 days or everything', () => {
    expect(rangeStart(25, 'ten')).toBe(15)
    expect(rangeStart(25, 'all')).toBe(0)
    expect(rangeStart(4, 'ten')).toBe(0)
  })
})

describe('periodStats', () => {
  it('handles an empty ledger', () => {
    const s = periodStats([], 'all')
    expect(s).toMatchObject({ change: 0, iMin: -1, iMax: -1, streakNow: 0, streakRecord: 0, streakRecordEnd: -1 })
  })

  it('handles a one-day ledger', () => {
    const s = periodStats(ledgerOf([2]), 'ten')
    expect(s).toMatchObject({ change: 2, iMin: 0, iMax: 0, iBest: 0, iWorst: 0, streakNow: 1, streakRecord: 1, streakRecordEnd: 0 })
  })

  it('keeps the earliest day on ties', () => {
    const s = periodStats(ledgerOf([1, -1, 1, -1]), 'all')
    expect(s.iMax).toBe(0)
    expect(s.iMin).toBe(1)
    expect(s.iBest).toBe(0)
    expect(s.iWorst).toBe(1)
  })

  it('computes change per range', () => {
    const l = ledgerOf([5, 5, 5, 5, 5, 5, 5, 5, 5, 5, -2, -2])
    expect(periodStats(l, 'all').change).toBe(46)
    expect(periodStats(l, 'ten').change).toBe(46 - 10)
  })

  it('separates current streak (whole history) from record (range)', () => {
    // long run of 5 early, then a break, then a run of 2 at the end
    const l = ledgerOf([1, 1, 1, 1, 1, 1, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 1, 1])
    const all = periodStats(l, 'all')
    expect(all.streakNow).toBe(2)
    expect(all.streakRecord).toBe(7)
    expect(all.streakRecordEnd).toBe(6)
    const ten = periodStats(l, 'ten')
    expect(ten.streakNow).toBe(2)
    expect(ten.streakRecord).toBe(2)
    expect(ten.streakRecordEnd).toBe(l.length - 1)
  })

  it('treats a zero delta as breaking the streak', () => {
    const s = periodStats(ledgerOf([1, 0, 1]), 'all')
    expect(s.streakNow).toBe(1)
    expect(s.streakRecord).toBe(1)
    expect(s.streakRecordEnd).toBe(0)
  })

  it('uses absolute indexes within the last-10 range', () => {
    const l = ledgerOf([9, 9, 9, 1, -1, 1, -1, 1, -1, 1, -1, 1, -1])
    const s = periodStats(l, 'ten')
    expect(s.iBest).toBe(3)
    expect(s.iMax).toBe(3)
  })
})

describe('smoothPath', () => {
  it('is empty for no points and a lone M for one', () => {
    expect(smoothPath([])).toBe('')
    expect(smoothPath([[1, 2]])).toBe('M1,2')
  })
  it('builds cubic segments', () => {
    expect(smoothPath([[0, 0], [10, 20]])).toBe('M0,0 C5,0 5,20 10,20')
  })
})

describe('chartGeometry', () => {
  it('uses step = max(28, width/10) and inner width', () => {
    const g = chartGeometry(ledgerOf([1, 1, 1]), 'all', 375)
    expect(g.step).toBe(37.5)
    expect(g.innerW).toBe(Math.round(37.5 * 3))
    expect(chartGeometry(ledgerOf([1]), 'all', 200).step).toBe(28)
    expect(g.height).toBe(190)
    expect(g.points[0][0]).toBe(18.75)
  })

  it('keeps 0 on the scale for all-positive ratings', () => {
    const g = chartGeometry(ledgerOf([1, 2, 3]), 'all', 375)
    expect(g.zeroY).toBeLessThanOrEqual(190 - 14)
    expect(g.zeroY).toBeGreaterThan(g.points[2][1])
  })

  it('keeps 0 on the scale for all-negative ratings', () => {
    const g = chartGeometry(ledgerOf([-1, -2, -3]), 'all', 375)
    expect(g.zeroY).toBeGreaterThanOrEqual(54)
    expect(g.zeroY).toBeLessThan(g.points[2][1])
  })

  it('handles flat zero and empty ledgers', () => {
    const g = chartGeometry(ledgerOf([0, 0]), 'all', 375)
    expect(g.zeroY).toBeGreaterThan(54)
    expect(g.zeroY).toBeLessThan(176)
    expect(chartGeometry([], 'ten', 375).points).toEqual([])
  })

  it('shows only the last 10 days in ten range', () => {
    const g = chartGeometry(ledgerOf(Array(14).fill(1)), 'ten', 375)
    expect(g.points).toHaveLength(10)
    expect(g.offset).toBe(4)
    expect(g.grid).toHaveLength(3)
  })
})
