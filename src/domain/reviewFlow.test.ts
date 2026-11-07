import { describe, expect, it } from 'vitest'
import {
  buildCards,
  entryForYesNo,
  goalLabelParts,
  parseNumeric,
  parseTime,
  shouldShowYesterdayReview,
  stepFor,
} from './reviewFlow'
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
  it('maps direction x answer', () => {
    expect(entryForYesNo('constructive', 'good')).toEqual({ kind: 'value', value: true })
    expect(entryForYesNo('constructive', 'bad')).toEqual({ kind: 'value', value: false })
    expect(entryForYesNo('destructive', 'good')).toEqual({ kind: 'value', value: false })
    expect(entryForYesNo('destructive', 'bad')).toEqual({ kind: 'value', value: true })
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
