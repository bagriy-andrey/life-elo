import { describe, expect, it } from 'vitest'
import {
  buildCards,
  decideModal,
  entryForYesNo,
  goalLabelParts,
  parseNumeric,
  parseTime,
  shouldShowYesterdayReview,
  stepFor,
  weeklyGoalNote,
} from './reviewFlow'
import { classifyZone } from '../engine/zones'
import { quotaZone } from '../engine/quota'
import { reviewDay } from './day'
import type { DayReview, Habit, HabitVersion } from './types'

const DAY = '2026-05-10'
const NOW = new Date(2026, 4, 11, 9, 0)

function habit(id: string, createdAt: number, v: Partial<HabitVersion> = {}, over: Partial<Habit> = {}): Habit {
  return {
    id,
    name: id,
    direction: 'constructive',
    versions: [{ from: '2026-01-01', tier: 'weak', rule: { kind: 'boolean' }, ...v }],
    active: true,
    effectiveFrom: '2026-01-01',
    createdAt,
    ...over,
  }
}

describe('buildCards', () => {
  it('puts yes/no first, then numeric/time, each by createdAt', () => {
    const steps = habit('steps', 1, { rule: { kind: 'measured', unit: 'steps', better: 'higher', excellent: 8000 } })
    const bed = habit('bed', 2, { rule: { kind: 'measured', unit: 'time', better: 'lower', excellent: '23:00' } })
    const b2 = habit('b2', 4)
    const b1 = habit('b1', 3)
    const cards = buildCards([steps, bed, b2, b1], DAY)
    expect(cards.map((c) => c.habitId)).toEqual(['b1', 'b2', 'steps', 'bed'])
    expect(cards.map((c) => c.stage)).toEqual(['boolean', 'boolean', 'numeric', 'time'])
  })

  it('classifies quota perDay undefined / 1 / 3', () => {
    const q = (id: string, perDay?: number) =>
      habit(id, 1, { rule: { kind: 'measured', unit: 'count', better: 'lower', excellent: 0 }, quota: { perDay, perWeek: 3 } }, { direction: 'destructive' })
    const cards = buildCards([q('u'), q('one', 1), q('three', 3)], DAY)
    const stage = (id: string) => cards.find((c) => c.habitId === id)?.stage
    expect(stage('u')).toBe('boolean')
    expect(stage('one')).toBe('boolean')
    expect(stage('three')).toBe('numeric')
  })

  it('sets weekly only for destructive habits with perWeek', () => {
    const d = habit('d', 1, { quota: { perWeek: 2 } }, { direction: 'destructive' })
    const c = habit('c', 2, { quota: { perWeek: 2 } })
    const cards = buildCards([d, c], DAY)
    expect(cards[0].weekly).toEqual({ perWeek: 2 })
    expect(cards[1].weekly).toBeUndefined()
  })

  it('skips inactive and not yet effective habits, uses settings on the day', () => {
    const cards = buildCards(
      [habit('off', 1, {}, { active: false }), habit('future', 2, {}, { effectiveFrom: '2026-06-01' }), habit('ok', 3)],
      DAY,
    )
    expect(cards.map((c) => c.habitId)).toEqual(['ok'])
    const changed = habit('m', 1, {}, {
      versions: [
        { from: '2026-01-01', tier: 'weak', rule: { kind: 'boolean' } },
        { from: '2026-05-10', tier: 'weak', rule: { kind: 'measured', unit: 'minutes', better: 'higher', excellent: 30 } },
      ],
    })
    expect(buildCards([changed], DAY)[0].stage).toBe('numeric')
    expect(buildCards([changed], '2026-05-09')[0].stage).toBe('boolean')
  })
})

describe('entryForYesNo', () => {
  const v = (value: boolean | number) => ({ kind: 'value', value })
  it('constructive without quota', () => {
    const c = { direction: 'constructive' as const }
    expect(entryForYesNo(c, 'good')).toEqual(v(true))
    expect(entryForYesNo(c, 'bad')).toEqual(v(false))
  })
  it('destructive without quota', () => {
    const c = { direction: 'destructive' as const }
    expect(entryForYesNo(c, 'good')).toEqual(v(true))
    expect(entryForYesNo(c, 'bad')).toEqual(v(false))
  })
  it('habit with quota uses counts', () => {
    for (const direction of ['destructive', 'constructive'] as const) {
      const c = { direction, quota: { perDay: 1 } }
      expect(entryForYesNo(c, 'good')).toEqual(v(0))
      expect(entryForYesNo(c, 'bad')).toEqual(v(1))
    }
  })
  it('agrees with the engine zones', () => {
    const day = '2026-11-03'
    const boolRule = { kind: 'boolean' } as const
    for (const direction of ['constructive', 'destructive'] as const) {
      const c = { direction }
      const zone = (a: 'good' | 'bad') => classifyZone({ direction, rule: boolRule }, entryForYesNo(c, a))
      expect(zone('good')).not.toBe('bad')
      expect(zone('bad')).toBe(direction === 'constructive' ? 'tolerable' : 'bad')
    }
    // quota: bad is a count over the limit (perDay 0 here; a weekly case follows)
    const q = { id: 'q', quota: { perDay: 0 } }
    const qc = { direction: 'destructive' as const, quota: q.quota }
    const zoneQ = (a: 'good' | 'bad') => quotaZone(q, day, { [day]: { q: entryForYesNo(qc, a) } })
    expect(zoneQ('good')).toBe('ok')
    expect(zoneQ('bad')).toBe('bad')
    const w = { id: 'q', quota: { perWeek: 1 } }
    const wc = { direction: 'destructive' as const, quota: w.quota }
    const prev = '2026-11-02'
    const zoneW = (a: 'good' | 'bad') =>
      quotaZone(w, day, { [prev]: { q: { kind: 'value', value: 1 } }, [day]: { q: entryForYesNo(wc, a) } })
    expect(zoneW('good')).toBe('ok')
    expect(zoneW('bad')).toBe('bad')
  })
})

describe('parseNumeric', () => {
  it('accepts integers within the guard', () => {
    expect(parseNumeric(' 8000 ', 'steps')).toEqual({ ok: true, value: 8000 })
    expect(parseNumeric('0', 'count')).toEqual({ ok: true, value: 0 })
    expect(parseNumeric('100000', 'steps')).toEqual({ ok: true, value: 100000 })
    expect(parseNumeric('1440', 'minutes')).toEqual({ ok: true, value: 1440 })
    expect(parseNumeric('1000', 'count')).toEqual({ ok: true, value: 1000 })
  })
  it('rejects empty, invalid and over max', () => {
    expect(parseNumeric('', 'count')).toEqual({ ok: false, error: 'empty' })
    for (const bad of ['-1', '1.5', 'abc', '1e3', '1,5']) {
      expect(parseNumeric(bad, 'count')).toEqual({ ok: false, error: 'invalid' })
    }
    expect(parseNumeric('100001', 'steps')).toEqual({ ok: false, error: 'max' })
    expect(parseNumeric('1441', 'minutes')).toEqual({ ok: false, error: 'max' })
    expect(parseNumeric('1001', 'count')).toEqual({ ok: false, error: 'max' })
    expect(parseNumeric('99999999999999999999', 'count')).toEqual({ ok: false, error: 'max' })
  })
})

describe('parseTime', () => {
  it('normalizes valid times', () => {
    expect(parseTime('23:05')).toEqual({ ok: true, value: '23:05' })
    expect(parseTime('7:30')).toEqual({ ok: true, value: '07:30' })
    expect(parseTime('00:00')).toEqual({ ok: true, value: '00:00' })
  })
  it('rejects empty and invalid', () => {
    expect(parseTime('  ')).toEqual({ ok: false, error: 'empty' })
    for (const bad of ['24:00', '12:60', '1230', 'ab:cd', '12:5']) {
      expect(parseTime(bad)).toEqual({ ok: false, error: 'invalid' })
    }
  })
})

describe('stepFor / goalLabelParts', () => {
  it('steps per unit', () => {
    expect(stepFor('steps')).toBe(500)
    expect(stepFor('minutes')).toBe(5)
    expect(stepFor('count')).toBe(1)
  })
  it('goal parts from excellent', () => {
    expect(goalLabelParts({ kind: 'boolean' })).toBeNull()
    expect(goalLabelParts({ kind: 'measured', unit: 'steps', better: 'higher', excellent: 8000 })).toEqual({
      unit: 'steps',
      value: 8000,
      better: 'higher',
    })
    expect(goalLabelParts({ kind: 'measured', unit: 'time', better: 'lower', excellent: '23:00' })).toEqual({
      unit: 'time',
      value: '23:00',
      better: 'lower',
    })
  })
})

describe('shouldShowYesterdayReview', () => {
  const habits = [habit('a', 1)]
  const base = { habits, reviews: [] as DayReview[], now: NOW, lastSyncedAt: 1 }
  it('shows when synced, unreviewed, with applicable habits', () => {
    expect(shouldShowYesterdayReview(base)).toBe(true)
  })
  it('hides before the first sync', () => {
    expect(shouldShowYesterdayReview({ ...base, lastSyncedAt: undefined })).toBe(false)
    expect(shouldShowYesterdayReview({ ...base, lastSyncedAt: null })).toBe(false)
  })
  it('hides when yesterday is already confirmed', () => {
    const review: DayReview = { day: DAY, entries: {}, confirmedAt: 1, revision: 0 }
    expect(shouldShowYesterdayReview({ ...base, reviews: [review] })).toBe(false)
  })
  it('ignores reviews of other days', () => {
    const review: DayReview = { day: '2026-05-09', entries: {}, confirmedAt: 1, revision: 0 }
    expect(shouldShowYesterdayReview({ ...base, reviews: [review] })).toBe(true)
  })
  it('hides without applicable habits', () => {
    expect(shouldShowYesterdayReview({ ...base, habits: [] })).toBe(false)
    expect(shouldShowYesterdayReview({ ...base, habits: [habit('x', 1, {}, { active: false })] })).toBe(false)
    expect(shouldShowYesterdayReview({ ...base, habits: [habit('x', 1, {}, { effectiveFrom: '2026-05-11' })] })).toBe(false)
  })
  it('is open through 23:59 of the next day', () => {
    expect(shouldShowYesterdayReview({ ...base, now: new Date(2026, 4, 11, 23, 59) })).toBe(true)
  })
})

describe('decideModal', () => {
  const now = new Date(2026, 5, 10, 12)
  const base = { habits: [habit('a', 1)], reviews: [] as DayReview[], now, lastSyncedAt: 1, savedHere: false, lastSavedDay: null }
  it('opens for the current review day', () => {
    expect(decideModal({ ...base, modalDay: null })).toEqual({ action: 'open', day: reviewDay(now) })
  })
  it('does not re-open the day this modal just saved', () => {
    expect(decideModal({ ...base, modalDay: null, lastSavedDay: reviewDay(now) })).toEqual({ action: 'none' })
  })
  it('opens the fresh day after midnight even if a stale day was saved', () => {
    expect(decideModal({ ...base, modalDay: null, lastSavedDay: '2026-06-01' })).toEqual({
      action: 'open',
      day: reviewDay(now),
    })
  })
  it('closes when no cards are left', () => {
    expect(decideModal({ ...base, habits: [], modalDay: reviewDay(now) })).toEqual({ action: 'close' })
  })
  it('closes when reviewed elsewhere, but not when saved here', () => {
    const reviews: DayReview[] = [{ day: reviewDay(now), entries: {}, confirmedAt: 1, revision: 0 }]
    expect(decideModal({ ...base, reviews, modalDay: reviewDay(now) })).toEqual({ action: 'close' })
    expect(decideModal({ ...base, reviews, savedHere: true, modalDay: reviewDay(now) })).toEqual({ action: 'none' })
  })
})

describe('weeklyGoalNote', () => {
  // 2026-05-10 is a Sunday; its week is Mon 05-04 .. Sun 05-10.
  const yes = { kind: 'value', value: true } as const
  it('counts a done day against the full target', () => {
    const h = habit('g', 1, { weeklyGoal: { perWeek: 4 } })
    expect(weeklyGoalNote(h, '2026-05-06', { '2026-05-06': { g: yes } })).toEqual({ done: 1, target: 4 })
  })
  it('pro-rates the target for a habit created mid-week', () => {
    const h = habit('g', 1, { from: '2026-05-07', weeklyGoal: { perWeek: 4 } }, { effectiveFrom: '2026-05-07' })
    expect(weeklyGoalNote(h, '2026-05-07', {})).toEqual({ done: 0, target: 3 })
  })
  it('is null without a weekly goal', () => {
    expect(weeklyGoalNote(habit('g', 1), '2026-05-06', {})).toBeNull()
  })
})
