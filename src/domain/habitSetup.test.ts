import { describe, expect, it } from 'vitest'
import {
  buildQuota,
  buildRule,
  EMPTY_FORM,
  editedVersions,
  hasAnswers,
  reducerUsers,
  withoutHabit,
  upsertVersion,
  validateReducer,
  type HabitForm,
} from './habitSetup'
import type { DayReview, Habit, HabitVersion, Quota } from './types'

const form = (p: Partial<HabitForm>): HabitForm => ({ ...EMPTY_FORM, ...p })
const habit = (p: Partial<Habit>): Habit => ({
  id: 'a',
  name: 'A',
  direction: 'constructive',
  versions: [{ from: '2026-01-01', tier: 'medium', rule: { kind: 'boolean' } }],
  active: true,
  effectiveFrom: '2026-01-01',
  createdAt: 0,
  ...p,
})
const withQuota = (id: string, quota: Quota): Habit =>
  habit({ id, versions: [{ from: '2026-01-01', tier: 'medium', rule: { kind: 'boolean' }, quota }] })
const v = (from: string, tier: HabitVersion['tier'] = 'medium'): HabitVersion => ({
  from,
  tier,
  rule: { kind: 'boolean' },
})

describe('buildRule', () => {
  it('boolean needs no thresholds', () => {
    expect(buildRule(form({}))).toEqual({ ok: true, value: { kind: 'boolean' } })
  })
  it('builds measured rule and omits empty thresholds', () => {
    expect(buildRule(form({ kind: 'steps', better: 'higher', excellent: '10000', tolerable: '5000' }))).toEqual({
      ok: true,
      value: { kind: 'measured', unit: 'steps', better: 'higher', excellent: 10000, tolerable: 5000 },
    })
  })
  it('time thresholds stay strings and order uses the day boundary', () => {
    const r = buildRule(form({ kind: 'time', better: 'lower', excellent: '23:00', tolerable: '00:30' }))
    expect(r.ok && r.value).toMatchObject({ excellent: '23:00', tolerable: '00:30' })
    expect(buildRule(form({ kind: 'time', excellent: '00:30', tolerable: '23:00' })).ok).toBe(false)
  })
  it('rejects missing, malformed and misordered thresholds', () => {
    expect(buildRule(form({ kind: 'minutes' })).ok).toBe(false)
    expect(buildRule(form({ kind: 'minutes', excellent: 'abc' })).ok).toBe(false)
    expect(buildRule(form({ kind: 'time', excellent: '25:00' })).ok).toBe(false)
    expect(buildRule(form({ kind: 'minutes', excellent: '10', ok: '5' })).ok).toBe(false)
    expect(buildRule(form({ kind: 'steps', better: 'higher', excellent: '5000', ok: '9000' })).ok).toBe(false)
  })
})

describe('buildQuota', () => {
  it('is empty for non-count kinds and blank limits', () => {
    expect(buildQuota(form({ kind: 'minutes', perDay: '1' }))).toEqual({ ok: true, value: undefined })
    expect(buildQuota(form({ kind: 'count' }))).toEqual({ ok: true, value: undefined })
  })
  it('builds limits and reducer', () => {
    expect(buildQuota(form({ kind: 'count', perDay: '1', perWeek: '2', reducedByDaysOf: 'sex' }))).toEqual({
      ok: true,
      value: { perDay: 1, perWeek: 2, reducedByDaysOf: 'sex' },
    })
  })
  it('rejects bad numbers and a reducer without limits', () => {
    expect(buildQuota(form({ kind: 'count', perDay: '1.5' })).ok).toBe(false)
    expect(buildQuota(form({ kind: 'count', reducedByDaysOf: 'sex' })).ok).toBe(false)
  })
})

describe('validateReducer', () => {
  const day = '2026-03-01'
  const sex = habit({ id: 'sex' })
  it('allows a plain reducer', () => {
    expect(validateReducer('m', { perDay: 1, reducedByDaysOf: 'sex' }, [sex], day)).toBeUndefined()
    expect(validateReducer(undefined, undefined, [sex], day)).toBeUndefined()
  })
  it('rejects self-reduction', () => {
    expect(validateReducer('sex', { perDay: 1, reducedByDaysOf: 'sex' }, [sex], day)).toBeDefined()
  })
  it('rejects a reducer that is itself reduced', () => {
    const reduced = withQuota('sex', { perDay: 1, reducedByDaysOf: 'x' })
    expect(validateReducer('m', { perDay: 1, reducedByDaysOf: 'sex' }, [reduced], day)).toBeDefined()
  })
  it('rejects reducing a habit that already serves as a reducer', () => {
    const m = withQuota('m', { perDay: 1, reducedByDaysOf: 'sex' })
    expect(validateReducer('sex', { perDay: 1, reducedByDaysOf: 'other' }, [m, sex, habit({ id: 'other' })], day)).toBeDefined()
  })
})

describe('versions', () => {
  it('upsert appends a later version and keeps earlier ones', () => {
    const out = upsertVersion([v('2026-01-01')], v('2026-02-01', 'strong'))
    expect(out.map((x) => x.from)).toEqual(['2026-01-01', '2026-02-01'])
  })
  it('upsert replaces the version starting the same day', () => {
    const out = upsertVersion([v('2026-01-01'), v('2026-02-01', 'weak')], v('2026-02-01', 'strong'))
    expect(out).toHaveLength(2)
    expect(out[1].tier).toBe('strong')
    expect(out[0].tier).toBe('medium')
  })
  it('edit keeps the earlier version and appends the new one', () => {
    const h = habit({ versions: [v('2026-01-01', 'weak')], effectiveFrom: '2026-01-01' })
    const out = editedVersions(h, { tier: 'strong', rule: { kind: 'boolean' } }, '2026-03-01')
    expect(out).toEqual([
      { from: '2026-01-01', tier: 'weak', rule: { kind: 'boolean' }, },
      { from: '2026-03-01', tier: 'strong', rule: { kind: 'boolean' } },
    ])
  })
  it('edit on the habit creation day replaces the only version', () => {
    const h = habit({ effectiveFrom: '2026-03-01', versions: [v('2026-03-01')] })
    const out = editedVersions(h, { tier: 'strong', rule: { kind: 'boolean' } }, '2026-03-01')
    expect(out).toHaveLength(1)
    expect(out[0].tier).toBe('strong')
  })
  it('edit dated before effectiveFrom is clamped so the seeded version is kept', () => {
    const h = habit({ versions: [v('2026-03-01', 'weak')], effectiveFrom: '2026-03-01' })
    const out = editedVersions(h, { tier: 'strong', rule: { kind: 'boolean' } }, '2026-02-01')
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ from: '2026-03-01', tier: 'strong' })
  })
})

describe('delete helpers', () => {
  const review = (entries: DayReview['entries']): DayReview => ({
    day: '2026-02-01',
    entries,
    confirmedAt: 5,
    revision: 2,
  })

  it('hasAnswers only counts value entries', () => {
    expect(hasAnswers('a', [review({ a: { kind: 'unknown' } }), review({ a: { kind: 'not_applicable' } })])).toBe(false)
    expect(hasAnswers('a', [review({ b: { kind: 'value', value: true } })])).toBe(false)
    expect(hasAnswers('a', [review({}), review({ a: { kind: 'value', value: false } })])).toBe(true)
  })

  it('reducerUsers finds users in any version, excluding self', () => {
    const old = habit({
      id: 'x',
      versions: [
        { from: '2026-01-01', tier: 'medium', rule: { kind: 'boolean' }, quota: { perDay: 2, reducedByDaysOf: 'a' } },
        { from: '2026-02-01', tier: 'medium', rule: { kind: 'boolean' } },
      ],
    })
    const other = withQuota('y', { perDay: 1 })
    expect(reducerUsers('a', [habit({ id: 'a' }), old, other]).map((h) => h.id)).toEqual(['x'])
    expect(reducerUsers('y', [old, other])).toEqual([])
  })

  it('withoutHabit removes only that key', () => {
    const r = review({ a: { kind: 'unknown' }, b: { kind: 'value', value: 1 } })
    const out = withoutHabit(r, 'a')
    expect(out).toEqual({ ...r, entries: { b: { kind: 'value', value: 1 } } })
    expect(r.entries.a).toBeDefined()
  })
})
