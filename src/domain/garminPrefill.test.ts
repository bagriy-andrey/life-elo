import { describe, expect, it } from 'vitest'
import { effectiveEntries, garminEvidence, mergeGarminPrefill, prefillFromGarmin } from './garminPrefill'
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
  it('skips habits before their effectiveFrom', () => {
    const late = habit('steps', 'steps', measured('steps'), { effectiveFrom: '2026-11-11' })
    expect(prefillFromGarmin([late], '2026-11-10', g)).toEqual({})
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

describe('garminEvidence', () => {
  it('returns entry + evidence per metric (bedtime from day+1)', () => {
    const ev = garminEvidence(habits, '2026-11-10', g)
    expect(ev.steps).toEqual({ entry: { kind: 'value', value: 8000 }, evidence: { kind: 'steps', value: 8000 } })
    expect(ev.bed.evidence).toEqual({ kind: 'bedtime', value: '23:40' })
    expect(ev.wake.evidence).toEqual({ kind: 'wake', value: '07:10' })
    expect(ev.sport.evidence).toEqual({ kind: 'activity', type: 'running', minutes: 30 })
  })
  it('uses the matching activity, not the first one', () => {
    const d: Record<string, GarminDay> = {
      '2026-11-10': { activities: [{ type: 'swimming', minutes: 5 }, { type: 'cycling', minutes: 45 }] },
    }
    expect(garminEvidence(habits, '2026-11-10', d).sport.evidence).toEqual({ kind: 'activity', type: 'cycling', minutes: 45 })
  })
  it('missing data, unbound and not applicable habits get no key', () => {
    expect(garminEvidence(habits, '2026-11-01', g)).toEqual({})
    const unbound = habit('u', 'steps', measured('steps'), { source: undefined })
    const late = habit('l', 'steps', measured('steps'), { effectiveFrom: '2026-11-11' })
    expect(garminEvidence([unbound, late], '2026-11-10', g)).toEqual({})
  })
})

describe('mergeGarminPrefill', () => {
  const v = (value: number | boolean) => ({ kind: 'value', value }) as const
  it('fills only card habits and respects touched ids', () => {
    const m = mergeGarminPrefill({ a: v(1), b: v(2), c: v(3) }, ['a', 'b'], { b: v(9) }, new Set(['b']))
    expect(m.answers).toEqual({ a: v(1), b: v(9) })
    expect(m.applied).toEqual(['a'])
  })
  it('refreshes untouched earlier values and keeps others', () => {
    const m = mergeGarminPrefill({ a: v(5) }, ['a', 'b'], { a: v(1), b: v(2) }, new Set())
    expect(m.answers).toEqual({ a: v(5), b: v(2) })
  })
})

describe('effectiveEntries', () => {
  const sug = (n: number) => ({ entry: { kind: 'value', value: n } as const, evidence: { kind: 'steps', value: n } as const })
  it('untouched habits get the suggestion, touched (incl. unknown) win, unbound get nothing', () => {
    const out = effectiveEntries(
      { b: { kind: 'value', value: 9 }, c: { kind: 'unknown' } },
      { a: sug(1), b: sug(2), c: sug(3) },
    )
    expect(out).toEqual({ a: { kind: 'value', value: 1 }, b: { kind: 'value', value: 9 }, c: { kind: 'unknown' } })
    expect('unbound' in out).toBe(false)
  })
})
