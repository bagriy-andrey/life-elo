import { describe, expect, it } from 'vitest'
import {
  buildQuota,
  buildRule,
  buildWeeklyGoal,
  deriveBetter,
  formOf,
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
    expect(buildRule(form({}), 'destructive')).toEqual({ ok: true, value: { kind: 'boolean' } })
  })
  it('builds measured rule and omits empty thresholds', () => {
    expect(buildRule(form({ kind: 'steps', better: 'higher', excellent: '10000', tolerable: '5000' }), 'constructive')).toEqual({
      ok: true,
      value: { kind: 'measured', unit: 'steps', better: 'higher', excellent: 10000, tolerable: 5000 },
    })
  })
  it('time thresholds stay strings and order uses the day boundary', () => {
    const r = buildRule(form({ kind: 'time', better: 'lower', excellent: '23:00', tolerable: '00:30' }), 'destructive')
    expect(r.ok && r.value).toMatchObject({ excellent: '23:00', tolerable: '00:30' })
    expect(buildRule(form({ kind: 'time', excellent: '00:30', tolerable: '23:00' }), 'destructive').ok).toBe(false)
  })
  it('rejects missing, malformed and misordered thresholds', () => {
    const err = { ok: false, error: { key: 'habitError.badThreshold' } }
    expect(buildRule(form({ kind: 'minutes' }), 'destructive')).toEqual({ ok: false, error: { key: 'habitError.excellentRequired' } })
    expect(buildRule(form({ kind: 'minutes', excellent: 'abc' }), 'destructive')).toEqual(err)
    expect(buildRule(form({ kind: 'time', excellent: '25:00' }), 'destructive')).toEqual(err)
    const order = { ok: false, error: { key: 'habitError.thresholdOrder' } }
    expect(buildRule(form({ kind: 'time', excellent: '00:30', tolerable: '23:00' }), 'destructive')).toEqual(order)
    expect(buildRule(form({ kind: 'minutes', excellent: '10', ok: '5' }), 'destructive')).toEqual(order)
    expect(buildRule(form({ kind: 'steps', better: 'higher', excellent: '5000', ok: '9000' }), 'destructive')).toEqual(order)
  })
})

describe('deriveBetter', () => {
  it.each([
    ['constructive', 'boolean', 'higher'],
    ['constructive', 'count', 'higher'],
    ['constructive', 'minutes', 'higher'],
    ['constructive', 'steps', 'higher'],
    ['constructive', 'time', 'lower'],
    ['destructive', 'count', 'lower'],
    ['destructive', 'minutes', 'lower'],
    ['destructive', 'time', 'lower'],
  ] as const)('%s %s -> %s', (direction, kind, expected) => {
    expect(deriveBetter(direction, kind)).toBe(expected)
  })
  it('buildRule derives better from direction when unset', () => {
    const r = buildRule(form({ kind: 'steps', excellent: '10000', ok: '5000' }), 'constructive')
    expect(r.ok && r.value).toMatchObject({ better: 'higher' })
    const d = buildRule(form({ kind: 'minutes', excellent: '10', ok: '20' }), 'destructive')
    expect(d.ok && d.value).toMatchObject({ better: 'lower' })
  })
  it('a stored better that disagrees with the direction is kept', () => {
    const r = buildRule(form({ kind: 'minutes', better: 'higher', excellent: '30', ok: '10' }), 'destructive')
    expect(r.ok && r.value).toMatchObject({ better: 'higher' })
  })
})

describe('buildWeeklyGoal', () => {
  const week = (p: Partial<HabitForm>) => form({ period: 'week', ...p })
  it('is undefined unless constructive yes/no with period week', () => {
    expect(buildWeeklyGoal(form({ weeklyTarget: '4' }), 'constructive')).toEqual({ ok: true, value: undefined })
    expect(buildWeeklyGoal(week({ weeklyTarget: '4' }), 'destructive')).toEqual({ ok: true, value: undefined })
    expect(buildWeeklyGoal(week({ kind: 'minutes', weeklyTarget: '4' }), 'constructive')).toEqual({ ok: true, value: undefined })
  })
  it('accepts integers 1-7', () => {
    expect(buildWeeklyGoal(week({ weeklyTarget: '1' }), 'constructive')).toEqual({ ok: true, value: { perWeek: 1 } })
    expect(buildWeeklyGoal(week({ weeklyTarget: '7' }), 'constructive')).toEqual({ ok: true, value: { perWeek: 7 } })
  })
  it.each(['', '0', '8', '2.5', 'x', '-1'])('rejects %j', (weeklyTarget) => {
    expect(buildWeeklyGoal(week({ weeklyTarget }), 'constructive')).toEqual({ ok: false, error: { key: 'habitError.weeklyTarget' } })
  })
})

describe('buildQuota', () => {
  const week = (p: Partial<HabitForm>) => form({ period: 'week', ...p })
  it('destructive yes/no weekly maps to perWeek 0-6', () => {
    expect(buildQuota(week({ weeklyTarget: '0' }), 'destructive')).toEqual({ ok: true, value: { perWeek: 0 } })
    expect(buildQuota(week({ weeklyTarget: '6' }), 'destructive')).toEqual({ ok: true, value: { perWeek: 6 } })
  })
  it.each(['', '7', '1.5', 'x'])('destructive yes/no weekly rejects %j', (weeklyTarget) => {
    expect(buildQuota(week({ weeklyTarget }), 'destructive')).toEqual({ ok: false, error: { key: 'habitError.weeklyTarget' } })
  })
  it('yes/no has no quota for period day or constructive', () => {
    expect(buildQuota(form({ weeklyTarget: '2' }), 'destructive')).toEqual({ ok: true, value: undefined })
    expect(buildQuota(week({ weeklyTarget: '2' }), 'constructive')).toEqual({ ok: true, value: undefined })
  })
  it('period is ignored for measured habits; count keeps its limits', () => {
    expect(buildQuota(week({ kind: 'minutes', weeklyTarget: '2' }), 'destructive')).toEqual({ ok: true, value: undefined })
    expect(buildQuota(week({ kind: 'count', perDay: '1', weeklyTarget: '9' }), 'destructive')).toEqual({ ok: true, value: { perDay: 1 } })
  })
  it('is empty for non-count kinds and blank limits', () => {
    expect(buildQuota(form({ kind: 'minutes', perDay: '1' }), 'destructive')).toEqual({ ok: true, value: undefined })
    expect(buildQuota(form({ kind: 'count' }), 'destructive')).toEqual({ ok: true, value: undefined })
  })
  it('builds limits and reducer', () => {
    expect(buildQuota(form({ kind: 'count', perDay: '1', perWeek: '2', reducedByDaysOf: 'sex' }), 'destructive')).toEqual({
      ok: true,
      value: { perDay: 1, perWeek: 2, reducedByDaysOf: 'sex' },
    })
  })
  it('rejects bad numbers and a reducer without limits', () => {
    expect(buildQuota(form({ kind: 'count', perDay: '1.5' }), 'destructive')).toEqual({ ok: false, error: { key: 'habitError.limitsInteger' } })
    expect(buildQuota(form({ kind: 'count', reducedByDaysOf: 'sex' }), 'destructive')).toEqual({ ok: false, error: { key: 'habitError.reducerNeedsLimit' } })
  })
})

describe('formOf', () => {
  it('prefills a weekly goal', () => {
    expect(formOf({ ...v('2026-01-01'), weeklyGoal: { perWeek: 4 } })).toMatchObject({ kind: 'boolean', period: 'week', weeklyTarget: '4' })
  })
  it('prefills a destructive weekly yes/no from quota.perWeek (including 0)', () => {
    expect(formOf({ ...v('2026-01-01'), quota: { perWeek: 0 } })).toMatchObject({ period: 'week', weeklyTarget: '0' })
  })
  it('plain yes/no is period day', () => {
    expect(formOf(v('2026-01-01'))).toEqual(EMPTY_FORM)
  })
  it('keeps the stored better and limits for measured rules', () => {
    const f = formOf({
      from: '2026-01-01',
      tier: 'medium',
      rule: { kind: 'measured', unit: 'count', better: 'higher', excellent: 3 },
      quota: { perDay: 2, reducedByDaysOf: 'x' },
    })
    expect(f).toMatchObject({ kind: 'count', better: 'higher', excellent: '3', perDay: '2', reducedByDaysOf: 'x' })
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
    expect(validateReducer('sex', { perDay: 1, reducedByDaysOf: 'sex' }, [sex], day)).toEqual({ key: 'habitError.reducerSelf' })
  })
  it('rejects a missing reducer', () => {
    expect(validateReducer('m', { perDay: 1, reducedByDaysOf: 'nope' }, [sex], day)).toEqual({ key: 'habitError.reducerMissing' })
  })
  it('rejects a reducer that is itself reduced', () => {
    const reduced = withQuota('sex', { perDay: 1, reducedByDaysOf: 'x' })
    expect(validateReducer('m', { perDay: 1, reducedByDaysOf: 'sex' }, [reduced], day)).toEqual({ key: 'habitError.reducerReduced' })
  })
  it('rejects reducing a habit that already serves as a reducer', () => {
    const m = withQuota('m', { perDay: 1, reducedByDaysOf: 'sex' })
    expect(validateReducer('sex', { perDay: 1, reducedByDaysOf: 'other' }, [m, sex, habit({ id: 'other' })], day)).toEqual({ key: 'habitError.alreadyReducer' })
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

describe('editedVersions weeklyGoal', () => {
  it('carries weeklyGoal and quota into the new version', () => {
    const h = habit({})
    const out = editedVersions(h, { tier: 'strong', rule: { kind: 'boolean' }, weeklyGoal: { perWeek: 3 } }, '2026-03-01')
    expect(out[1]).toEqual({ from: '2026-03-01', tier: 'strong', rule: { kind: 'boolean' }, weeklyGoal: { perWeek: 3 } })
  })
  it('drops weeklyGoal when the new settings have none', () => {
    const h = habit({ versions: [{ ...v('2026-01-01'), weeklyGoal: { perWeek: 3 } }] })
    const out = editedVersions(h, { tier: 'medium', rule: { kind: 'boolean' } }, '2026-03-01')
    expect(out[0].weeklyGoal).toEqual({ perWeek: 3 })
    expect(out[1].weeklyGoal).toBeUndefined()
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
