import { describe, expect, it } from 'vitest'
import { fitSize } from './photo'

describe('fitSize', () => {
  it('downscales landscape keeping ratio', () => {
    expect(fitSize(4000, 3000)).toEqual({ width: 256, height: 192 })
  })
  it('downscales portrait keeping ratio', () => {
    expect(fitSize(3000, 4000)).toEqual({ width: 192, height: 256 })
  })
  it('never upscales', () => {
    expect(fitSize(100, 50)).toEqual({ width: 100, height: 50 })
    expect(fitSize(256, 256)).toEqual({ width: 256, height: 256 })
  })
  it('keeps at least 1px on extreme ratios', () => {
    expect(fitSize(10000, 5)).toEqual({ width: 256, height: 1 })
  })
  it('respects a custom max and degenerate input', () => {
    expect(fitSize(200, 100, 100)).toEqual({ width: 100, height: 50 })
    expect(fitSize(0, 0)).toEqual({ width: 1, height: 1 })
  })
})
