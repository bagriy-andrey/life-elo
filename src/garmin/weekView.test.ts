import { describe, expect, it } from 'vitest'
import { garminWeekView, sleepFractions } from './weekView'
import type { GarminDay, GarminDetail } from '../domain/types'

const row = (o: Partial<GarminDay> = {}): GarminDay => ({ activities: [], ...o })
const det = (goal?: number, moderate?: number, vigorous?: number): GarminDetail => ({
  summary: {
    ...(goal !== undefined && { movement: { steps: { goal } } }),
    ...(moderate !== undefined && { intensityMinutes: { goal: 150, moderate, vigorous } }),
  },
})

describe('sleepFractions', () => {
  it('23:03 -> 07:30 across midnight', () => {
    const f = sleepFractions('23:03', '07:30')!
    expect(f.startFrac).toBeCloseTo(63 / 720, 5)
    expect(f.endFrac).toBeCloseTo(570 / 720, 5)
  })
  it('clamps to the axis and rejects empty/invalid', () => {
    expect(sleepFractions('20:00', '11:30')).toEqual({ startFrac: 0, endFrac: 1 })
    expect(sleepFractions('00:30', '08:48')!.startFrac).toBeCloseTo(150 / 720, 5)
    expect(sleepFractions(undefined, '08:00')).toBeUndefined()
    expect(sleepFractions('bad', '08:00')).toBeUndefined()
    expect(sleepFractions('09:00', '08:00')).toBeUndefined()
  })
})

describe('garminWeekView', () => {
  // Fri 2026-11-13; week Mon 09 .. Sun 15.
  const rows = {
    '2026-11-09': row({ steps: 8000, sleepStart: '23:00', sleepEnd: '07:00' }),
    '2026-11-11': row({ steps: 12000 }),
    '2026-11-13': row({ steps: 40, sleepStart: '00:30', sleepEnd: '08:48' }),
  }
  const details = {
    '2026-11-09': det(11000, 30, 10),
    '2026-11-11': det(11200, 10, 0),
    '2026-11-13': det(11400),
  }
  const w = garminWeekView('2026-11-13', '2026-11-13', rows, details)

  it('spans Monday to Sunday with states', () => {
    expect(w.start).toBe('2026-11-09')
    expect(w.end).toBe('2026-11-15')
    expect(w.days.map((d) => d.dayNum)).toEqual([9, 10, 11, 12, 13, 14, 15])
    expect(w.days.map((d) => d.state)).toEqual(['past', 'past', 'past', 'past', 'selected', 'future', 'future'])
    expect(w.days[4].isToday).toBe(true)
    expect(w.days[0].isToday).toBe(false)
  })

  it('gaps: missing days have no steps/sleep, goal carried forward', () => {
    expect(w.days[1]).toMatchObject({ hasData: false })
    expect(w.days[1].steps).toBeUndefined()
    expect(w.days[1].goal).toBe(11000)
    expect(w.days[3].goal).toBe(11200)
    expect(w.days[5].goal).toBe(11400)
    expect(w.stepsGoal).toBe(11400)
  })

  it('leading gap takes the first known goal; no goals at all -> undefined', () => {
    const w2 = garminWeekView('2026-11-12', '2026-11-13', {}, { '2026-11-11': det(9000) })
    expect(w2.days[0].goal).toBe(9000)
    expect(garminWeekView('2026-11-12', '2026-11-13', {}, {}).stepsGoal).toBeUndefined()
  })

  it('selected past day while today is elsewhere keeps today state', () => {
    const w3 = garminWeekView('2026-11-10', '2026-11-13', rows, details)
    expect(w3.days.map((d) => d.state)).toEqual(['past', 'selected', 'past', 'past', 'today', 'future', 'future'])
    expect(w3.days[4].isToday).toBe(true)
  })

  it('sleep strip fractions from the row', () => {
    expect(w.days[0].sleep!.startFrac).toBeCloseTo(60 / 720, 5)
    expect(w.days[2].sleep).toBeUndefined()
  })

  it('intensity week sum is moderate + 2*vigorous, up to today, incomplete when days lack data', () => {
    expect(w.intensity).toEqual({ minutes: 30 + 20 + 10, goal: 150, complete: false })
    const full = garminWeekView('2026-11-11', '2026-11-11', {}, { '2026-11-09': det(1, 30, 10), '2026-11-10': det(1, 5, 0), '2026-11-11': det(1, 0, 0) })
    expect(full.intensity).toEqual({ minutes: 55, goal: 150, complete: true })
  })

  it('month/year rollover', () => {
    const y = garminWeekView('2026-01-01', '2026-01-01', {}, {})
    expect(y.start).toBe('2025-12-29')
    expect(y.end).toBe('2026-01-04')
    expect(y.days[0].dayNum).toBe(29)
  })
})
