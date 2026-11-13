import { describe, expect, it } from 'vitest'
import { buildDetail, type GarminDetailRaw } from './detail'
import { garminDayDigest, qualifierTone } from './dayDigest'
import type { GarminDay, GarminDetail } from '../domain/types'
import summaries from './fixtures/detail-summaries.json'
import sleep from './fixtures/detail-sleep.json'
import hr from './fixtures/detail-hr.json'
import hrv from './fixtures/detail-hrv.json'
import spo2 from './fixtures/detail-spo2.json'
import bodyBattery from './fixtures/detail-bodybattery.json'
import activities from './fixtures/detail-activities.json'

const raw: GarminDetailRaw = { summaries, sleep, heartRate: hr, hrv, spo2, bodyBattery, activities }
const detail12 = buildDetail(raw, '2026-11-12')
const row = (o: Partial<GarminDay> = {}): GarminDay => ({ activities: [], ...o })

// Synthetic «13.11, day in progress»: values from the plan summary.
const detail13: GarminDetail = {
  summary: {
    movement: { steps: { value: 40, goal: 11400, distanceInMeters: 30 } },
    bodyBattery: { latestValue: 98, chargedValue: 62, drainedValue: 4 },
    stress: { avgLevel: 20, maxLevel: 70, restDurationInMillis: 96000, lowStressDurationInMillis: 4000 },
  },
  sleep: { sleepTimeSeconds: 8 * 3600 + 16 * 60, sleepScores: { overall: { value: 93, qualifierKey: 'EXCELLENT' } }, sleepNeed: { actual: 480 } },
  hrv: { hrvSummary: { lastNightAvg: 55, status: 'UNBALANCED', baseline: { balancedLow: 56, balancedUpper: 64 } } },
}

describe('garminDayDigest', () => {
  it('today in progress: partial, steps vs goal, sleep, battery, HRV below norm, stress rest share', () => {
    const d = garminDayDigest('2026-11-13', '2026-11-13', row({ steps: 40, sleepStart: '00:30', sleepEnd: '08:48' }), detail13)
    expect(d.partial).toBe(true)
    expect(d.empty).toBe(false)
    expect(d.steps).toMatchObject({ value: 40, goal: 11400 })
    expect(d.sleep).toMatchObject({ durationSec: 29760, start: '00:30', end: '08:48', score: 93, qualifier: 'EXCELLENT', tone: 'pos', needMin: 480 })
    expect(d.recovery).toMatchObject({ bbNow: 98, bbMax: 100, bbCharged: 62, bbDrained: 4 })
    expect(d.recovery.hrv).toMatchObject({ value: 55, position: 'below', tone: 'neg', baseline: { low: 56, high: 64 } })
    expect(d.stress).toMatchObject({ avg: 20, max: 70, restPct: 96 })
  })

  it('past day is not partial; fixture 12.11 values', () => {
    const d = garminDayDigest('2026-11-12', '2026-11-13', row({ steps: 11711, activities: [{ type: 'strength_training', minutes: 69 }] }), detail12)
    expect(d.partial).toBe(false)
    expect(d.steps).toMatchObject({ value: 11711, goal: 11320, distanceM: 9760, floorsUp: 13 })
    expect(d.recovery.restingHr).toBe(49)
    expect(d.recovery.restingHrWeek).toBe(47)
    expect(d.recovery.hrv).toMatchObject({ value: 54, position: 'below', status: 'UNBALANCED', weeklyAvg: 55, peak5Min: 75 })
    expect(d.recovery.hrv!.scaleMin).toBeLessThanOrEqual(54)
    expect(d.recovery.hrv!.scaleMax).toBeGreaterThanOrEqual(64)
    expect(d.intensity).toEqual({ moderate: 45, vigorous: 0, goal: 150, dayMinutes: 45 })
    expect(d.workouts).toEqual([{ type: 'strength_training', minutes: 69 }])
    expect(d.sleep!.stages.length).toBeGreaterThan(1)
    expect(d.sleep!.stages.reduce((a, s) => a + s.pct, 0)).toBeGreaterThanOrEqual(99)
    expect(d.recovery.bbCurve.length).toBeGreaterThan(2)
  })

  it('summary-only row: sleep duration from start/end across midnight, no detail parts', () => {
    const d = garminDayDigest('2026-11-10', '2026-11-13', row({ steps: 5000, sleepStart: '23:03', sleepEnd: '07:30' }), undefined)
    expect(d.sleep).toMatchObject({ durationSec: (8 * 60 + 27) * 60, tone: 'plain', stages: [], chips: [] })
    expect(d.steps).toEqual({ value: 5000 })
    expect(d.recovery.hrv).toBeUndefined()
    expect(d.stress).toBeUndefined()
  })

  it('empty row and empty detail: empty digest, last night not uploaded -> no sleep', () => {
    const d = garminDayDigest('2026-11-13', '2026-11-13', undefined, {})
    expect(d.empty).toBe(true)
    expect(d.sleep).toBeUndefined()
    expect(d.workouts).toEqual([])
    expect(garminDayDigest('2026-11-13', '2026-11-13', row({ steps: 40 }), undefined).empty).toBe(false)
  })

  it('missing HRV baseline: no corridor, no position, plain tone', () => {
    const d = garminDayDigest('2026-11-12', '2026-11-13', undefined, { hrv: { hrvSummary: { lastNightAvg: 50 } } })
    expect(d.recovery.hrv).toMatchObject({ value: 50, tone: 'plain' })
    expect(d.recovery.hrv!.baseline).toBeUndefined()
    expect(d.recovery.hrv!.position).toBeUndefined()
  })

  it('HRV inside / above the corridor', () => {
    const mk = (v: number): GarminDetail => ({ hrv: { hrvSummary: { lastNightAvg: v, baseline: { balancedLow: 56, balancedUpper: 64 } } } })
    expect(garminDayDigest('d', 'x', undefined, mk(60)).recovery.hrv).toMatchObject({ position: 'within', tone: 'pos' })
    expect(garminDayDigest('d', 'x', undefined, mk(70)).recovery.hrv).toMatchObject({ position: 'above', tone: 'plain' })
  })

  it('workouts fall back to detail activities', () => {
    const d = garminDayDigest('d', 'x', row(), { activities: [{ activityType: { typeKey: 'running' }, duration: 1800 }] })
    expect(d.workouts).toEqual([{ type: 'running', minutes: 30 }])
  })

  it('qualifier tones', () => {
    expect(qualifierTone('GOOD')).toBe('pos')
    expect(qualifierTone('FAIR')).toBe('plain')
    expect(qualifierTone('POOR')).toBe('neg')
    expect(qualifierTone(undefined)).toBe('plain')
  })
})
