import { describe, expect, it } from 'vitest'
import { prefillFromGarmin } from './garminPrefill'
import type { GarminDay, GarminMetric, Habit, ZonedRule } from './types'

const measured = (unit: 'steps' | 'time' | 'count'): ZonedRule => ({
  kind: 'measured', unit, better: 'higher', excellent: unit === 'time' ? '23:00' : 10,
})

function habit(id: string, metric: GarminMetric, rule: ZonedRule, extra: Partial<Habit> = {}): Habit {
  return {
    id, name: id, direction: 'constructive', active: true, effectiveFrom: '2026-01-01', createdAt: 0,
    versions: [{ from: '2026-01-01', tier: 'medium', rule }],
    source: { kind: 'garmin', metric, activityTypes: ['running', 'cycling'] },
    ...extra,
  }
}

const g: Record<string, GarminDay> = {
  '2026-11-10': {
    steps: 8000, sleepEnd: '07:10',
    activities: [{ type: 'running', minutes: 30 }],
  },
  '2026-11-11': { sleepStart: '23:40', sleepEnd: '06:00', activities: [] },
}
const habits = [
  habit('steps', 'steps', measured('steps')),
  habit('bed', 'bedtime', measured('time')),
  habit('wake', 'wake', measured('time')),
  habit('sport', 'activity', { kind: 'boolean' }),
]

describe('prefillFromGarmin', () => {
  it('maps each metric with night attribution', () => {
    expect(prefillFromGarmin(habits, '2026-11-10', g)).toEqual({
      steps: { kind: 'value', value: 8000 },
      bed: { kind: 'value', value: '23:40' },
      wake: { kind: 'value', value: '07:10' },
      sport: { kind: 'value', value: true },
    })
  })
  it('leaves missing data absent', () => {
    expect(prefillFromGarmin(habits, '2026-11-11', g)).toEqual({
      wake: { kind: 'value', value: '06:00' },
    })
    expect(prefillFromGarmin(habits, '2026-11-01', g)).toEqual({})
  })
  it('filters activity by type, never answers no', () => {
    const swim: Record<string, GarminDay> = { '2026-11-10': { activities: [{ type: 'swimming', minutes: 20 }] } }
    expect(prefillFromGarmin(habits, '2026-11-10', swim)).toEqual({})
  })
  it('ignores incompatible rules, inactive, unlinked and destructive activity', () => {
    const hs = [
      habit('a', 'steps', measured('count')),
      habit('b', 'bedtime', { kind: 'boolean' }),
      habit('c', 'activity', measured('steps')),
      habit('d', 'steps', measured('steps'), { active: false }),
      habit('e', 'steps', measured('steps'), { source: undefined }),
      habit('f', 'activity', { kind: 'boolean' }, { direction: 'destructive' }),
    ]
    expect(prefillFromGarmin(hs, '2026-11-10', g)).toEqual({})
  })
})
