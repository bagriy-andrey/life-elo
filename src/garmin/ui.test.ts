import { describe, expect, it } from 'vitest'
import { activityTypeKeys, buildSource, compatibleMetrics, humanizeType, keyExpiry } from './ui'

describe('garmin ui helpers', () => {
  it('filters metrics by rule', () => {
    expect(compatibleMetrics('steps', 'constructive')).toEqual(['steps'])
    expect(compatibleMetrics('time', 'destructive')).toEqual(['bedtime', 'wake'])
    expect(compatibleMetrics('boolean', 'constructive')).toEqual(['activity'])
    expect(compatibleMetrics('boolean', 'destructive')).toEqual([])
    expect(compatibleMetrics('count', 'constructive')).toEqual([])
    expect(compatibleMetrics('minutes', 'constructive')).toEqual([])
  })
  it('humanises type keys', () => {
    expect(humanizeType('strength_training')).toBe('Strength training')
    expect(humanizeType('rowing')).toBe('Rowing')
  })
  it('lists named types then extras, deduped', () => {
    const keys = activityTypeKeys(['rowing', 'yoga', 'boxing'], ['skiing', 'rowing'])
    expect(keys.slice(0, 8)).toContain('paddelball')
    expect(keys.slice(8)).toEqual(['boxing', 'rowing', 'skiing'])
  })
  it('builds or drops the source', () => {
    expect(buildSource('', [], 'steps', 'constructive')).toBeUndefined()
    expect(buildSource('steps', [], 'steps', 'constructive')).toEqual({ kind: 'garmin', metric: 'steps' })
    expect(buildSource('steps', [], 'time', 'constructive')).toBeUndefined()
    expect(buildSource('activity', ['yoga'], 'boolean', 'constructive')).toEqual({
      kind: 'garmin',
      metric: 'activity',
      activityTypes: ['yoga'],
    })
    expect(buildSource('activity', ['yoga'], 'boolean', 'destructive')).toBeUndefined()
  })
  it('classifies key expiry', () => {
    const now = Date.parse('2026-11-11T00:00:00Z')
    expect(keyExpiry(null, now)).toBe('unknown')
    expect(keyExpiry('2026-11-10T00:00:00Z', now)).toBe('expired')
    expect(keyExpiry('2026-11-17T00:00:00Z', now)).toBe('soon')
    expect(keyExpiry('2026-12-11T00:00:00Z', now)).toBe('ok')
  })
})
