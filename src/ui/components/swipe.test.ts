import { describe, expect, it } from 'vitest'
import { swipeDecision } from './swipe'

describe('swipeDecision', () => {
  it('snaps back below the threshold at low speed', () => {
    expect(swipeDecision(60, 0.1, 360)).toBeNull()
    expect(swipeDecision(-60, -0.1, 360)).toBeNull()
    expect(swipeDecision(0, 0, 360)).toBeNull()
  })
  it('commits right = good, left = bad over the threshold', () => {
    expect(swipeDecision(95, 0, 360)).toBe('good')
    expect(swipeDecision(-95, 0, 360)).toBe('bad')
  })
  it('commits a fling on a short drag', () => {
    expect(swipeDecision(40, 0.9, 360)).toBe('good')
    expect(swipeDecision(-40, -0.9, 360)).toBe('bad')
  })
  it('ignores a fling against the drag direction or a tiny jitter', () => {
    expect(swipeDecision(40, -0.9, 360)).toBeNull()
    expect(swipeDecision(5, 2, 360)).toBeNull()
  })
  it('shrinks the threshold on a very narrow card', () => {
    expect(swipeDecision(50, 0, 100)).toBe('good')
  })
})
