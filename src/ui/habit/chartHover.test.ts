import { describe, expect, it } from 'vitest'
import { nearestIndex, smoothRuns } from './chartHover'

describe('smoothRuns', () => {
  it('breaks the line at gaps and curves through every point', () => {
    const d = smoothRuns([[0, 10], [10, 20], null, [30, 5], [40, 5], [50, 0]])
    expect(d.match(/M/g)).toHaveLength(2)
    expect(d.startsWith('M0 10C')).toBe(true)
    expect(d).toContain('M30 5C')
    expect(d.endsWith('50 0')).toBe(true)
  })
  it('a lone point is a bare move; a flat segment stays flat (no overshoot)', () => {
    expect(smoothRuns([null, [5, 5], null])).toBe('M5 5')
    expect(smoothRuns([[0, 5], [10, 5]])).toBe('M0 5C3.33 5 6.67 5 10 5')
  })
})

describe('nearestIndex', () => {
  it('picks the closest day with data', () => {
    const has = [true, false, false, true, false]
    expect(nearestIndex(has, 0)).toBe(0)
    expect(nearestIndex(has, 0.5)).toBe(3)
    expect(nearestIndex(has, 0.99)).toBe(3)
    expect(nearestIndex([false, false], 0.5)).toBeNull()
  })
})
