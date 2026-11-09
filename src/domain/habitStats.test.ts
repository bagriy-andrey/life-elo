import { describe, expect, it } from 'vitest'
import {
  bestStreak,
  chartKind,
  completionPercent,
  currentStreak,
  dayCells,
  habitNorms,
  weekdayPercent,
  weekResults,
  weekStreaks,
} from './habitStats'
import type { DayKey, DayReview, Habit, HabitEntry, HabitVersion } from './types'

// 2026-11-11 is a Wednesday; the week is Mon 11-09 .. Sun 11-15, the previous one Mon 11-02 .. Sun 11-08.
const TODAY = '2026-11-11'

function habit(over: Partial<Habit> & { version?: Partial<HabitVersion> }): Habit {
  const { version, ...rest } = over
  return {
    id: 'h',
    name: 'H',
    direction: 'constructive',
    versions: [{ from: '2026-01-01', tier: 'medium', rule: { kind: 'boolean' }, ...version }],
    active: true,
    effectiveFrom: '2026-01-01',
    createdAt: 0,
    ...rest,
  }
}

const review = (day: DayKey, entry: HabitEntry): DayReview => ({
  day,
  entries: { h: entry },
  confirmedAt: 0,
  revision: 0,
})
const yes = (day: DayKey, v = true) => review(day, { kind: 'value', value: v })
const val = (day: DayKey, v: number | string) => review(day, { kind: 'value', value: v })
const na = (day: DayKey) => review(day, { kind: 'not_applicable' })
const unknown = (day: DayKey) => review(day, { kind: 'unknown' })

const statusOn = (h: Habit, reviews: DayReview[], day: DayKey) =>
  dayCells(h, reviews, day, day, TODAY)[0].status

describe('chartKind', () => {
  it('maps rules to chart kinds', () => {
    expect(chartKind(habit({}), TODAY)).toBe('yesno')
    expect(chartKind(habit({ version: { weeklyGoal: { perWeek: 3 } } }), TODAY)).toBe('weekly')
    expect(chartKind(habit({ direction: 'destructive', version: { quota: { perWeek: 2 } } }), TODAY)).toBe('weekly')
    expect(chartKind(habit({ direction: 'destructive', version: { quota: { perDay: 2 } } }), TODAY)).toBe('yesno')
    const minutes = { kind: 'measured', unit: 'minutes', better: 'higher', excellent: 30 } as const
    expect(chartKind(habit({ version: { rule: minutes } }), TODAY)).toBe('amount')
    const count = { kind: 'measured', unit: 'count', better: 'higher', excellent: 3 } as const
    expect(chartKind(habit({ version: { rule: count, quota: { perWeek: 3 } } }), TODAY)).toBe('amount')
    const time = { kind: 'measured', unit: 'time', better: 'lower', excellent: '07:00' } as const
    expect(chartKind(habit({ version: { rule: time } }), TODAY)).toBe('time')
  })

  it('uses the version in force on the given day', () => {
    const h = habit({})
    h.versions.push({ from: '2026-06-01', tier: 'medium', rule: { kind: 'boolean' }, weeklyGoal: { perWeek: 2 } })
    expect(chartKind(h, '2026-05-01')).toBe('yesno')
    expect(chartKind(h, TODAY)).toBe('weekly')
  })
})

describe('dayCells status mapping', () => {
  it('constructive yes/no', () => {
    const h = habit({})
    expect(statusOn(h, [yes('2026-11-05')], '2026-11-05')).toBe('success')
    expect(statusOn(h, [yes('2026-11-05', false)], '2026-11-05')).toBe('fail')
  })

  it('destructive yes/no: held is success, slipped is fail', () => {
    const h = habit({ direction: 'destructive' })
    expect(statusOn(h, [yes('2026-11-05', true)], '2026-11-05')).toBe('success')
    expect(statusOn(h, [yes('2026-11-05', false)], '2026-11-05')).toBe('fail')
  })

  it('not applicable is skipped; unknown and missing are nodata', () => {
    const h = habit({})
    expect(statusOn(h, [na('2026-11-05')], '2026-11-05')).toBe('skipped')
    expect(statusOn(h, [unknown('2026-11-05')], '2026-11-05')).toBe('nodata')
    expect(statusOn(h, [], '2026-11-05')).toBe('nodata')
  })

  it('today and later are future (pending), before effectiveFrom is empty', () => {
    const h = habit({ effectiveFrom: '2026-11-03' })
    const cells = dayCells(h, [yes(TODAY)], '2026-11-02', '2026-11-12', TODAY)
    expect(cells[0].status).toBe('empty')
    expect(cells[1].status).toBe('nodata')
    expect(cells.find((c) => c.day === TODAY)?.status).toBe('future')
    expect(cells.at(-1)?.status).toBe('future')
    expect(cells).toHaveLength(11)
  })

  it('keeps the value on cells that have one', () => {
    expect(dayCells(habit({}), [yes('2026-11-05')], '2026-11-05', '2026-11-05', TODAY)[0].value).toBe(true)
  })

  it('measured constructive: excellent/ok success, below target fail', () => {
    const rule = { kind: 'measured', unit: 'minutes', better: 'higher', excellent: 30, ok: 20 } as const
    const h = habit({ version: { rule } })
    expect(statusOn(h, [val('2026-11-05', 40)], '2026-11-05')).toBe('success')
    expect(statusOn(h, [val('2026-11-05', 20)], '2026-11-05')).toBe('success')
    expect(statusOn(h, [val('2026-11-05', 10)], '2026-11-05')).toBe('fail')
  })

  it('measured destructive: bad is fail, tolerable is fail, within ok is success', () => {
    const rule = { kind: 'measured', unit: 'count', better: 'lower', excellent: 0, ok: 1, tolerable: 2 } as const
    const h = habit({ direction: 'destructive', version: { rule } })
    expect(statusOn(h, [val('2026-11-05', 1)], '2026-11-05')).toBe('success')
    expect(statusOn(h, [val('2026-11-05', 2)], '2026-11-05')).toBe('fail')
    expect(statusOn(h, [val('2026-11-05', 5)], '2026-11-05')).toBe('fail')
  })

  it('time: excellent/ok success, tolerable yellow, late fail', () => {
    const rule = { kind: 'measured', unit: 'time', better: 'lower', excellent: '07:00', tolerable: '07:30' } as const
    const h = habit({ version: { rule } })
    expect(statusOn(h, [val('2026-11-05', '06:55')], '2026-11-05')).toBe('success')
    expect(statusOn(h, [val('2026-11-05', '07:20')], '2026-11-05')).toBe('tolerable')
    const strict = habit({ direction: 'destructive', version: { rule } })
    expect(statusOn(strict, [val('2026-11-05', '08:00')], '2026-11-05')).toBe('fail')
  })

  it('uses the version in force on each day', () => {
    const h = habit({ version: { rule: { kind: 'measured', unit: 'minutes', better: 'higher', excellent: 30 } } })
    h.versions.push({
      from: '2026-11-04',
      tier: 'medium',
      rule: { kind: 'measured', unit: 'minutes', better: 'higher', excellent: 60 },
    })
    const reviews = [val('2026-11-03', 40), val('2026-11-05', 40)]
    expect(statusOn(h, reviews, '2026-11-03')).toBe('success')
    expect(statusOn(h, reviews, '2026-11-05')).toBe('fail')
  })
})

describe('habitNorms', () => {
  it('constructive measured: target = excellent', () => {
    const rule = { kind: 'measured', unit: 'minutes', better: 'higher', excellent: 30 } as const
    expect(habitNorms(habit({ version: { rule } }), TODAY)).toEqual({
      unit: 'minutes',
      better: 'higher',
      target: 30,
    })
  })

  it('destructive limit is tolerable ?? ok ?? excellent, lowered to perDay', () => {
    const rule = { kind: 'measured', unit: 'count', better: 'lower', excellent: 0, ok: 2, tolerable: 4 } as const
    const d = (quota?: { perDay: number }) =>
      habitNorms(habit({ direction: 'destructive', version: { rule, quota } }), TODAY).limit
    expect(d()).toBe(4)
    expect(d({ perDay: 3 })).toBe(3)
    expect(d({ perDay: 9 })).toBe(4)
    const okOnly = { kind: 'measured', unit: 'count', better: 'lower', excellent: 0, ok: 2 } as const
    expect(habitNorms(habit({ direction: 'destructive', version: { rule: okOnly } }), TODAY).limit).toBe(2)
    const exOnly = { kind: 'measured', unit: 'count', better: 'lower', excellent: 1 } as const
    expect(habitNorms(habit({ direction: 'destructive', version: { rule: exOnly } }), TODAY).limit).toBe(1)
  })

  it('time: minutes, stored tolerable and the +30 min default', () => {
    const base = { kind: 'measured', unit: 'time', better: 'lower', excellent: '07:00' } as const
    const stored = habitNorms(habit({ version: { rule: { ...base, tolerable: '07:45' } } }), TODAY)
    expect(stored).toMatchObject({ unit: 'time', target: 420, tolerableBound: 465 })
    const dflt = habitNorms(habit({ version: { rule: base } }), TODAY)
    expect(dflt.tolerableBound).toBe(450)
  })

  it('time after midnight wraps through timeToMinutes', () => {
    const rule = { kind: 'measured', unit: 'time', better: 'lower', excellent: '00:30' } as const
    expect(habitNorms(habit({ version: { rule } }), TODAY)).toMatchObject({ target: 1470, tolerableBound: 1500 })
  })

  it('weekly: target / limit from the goal or quota', () => {
    expect(habitNorms(habit({ version: { weeklyGoal: { perWeek: 3 } } }), TODAY)).toMatchObject({
      unit: 'boolean',
      target: 3,
    })
    expect(
      habitNorms(habit({ direction: 'destructive', version: { quota: { perWeek: 2 } } }), TODAY),
    ).toMatchObject({ unit: 'boolean', limit: 2 })
  })
})

describe('daily streaks', () => {
  const h = habit({ effectiveFrom: '2026-11-01' })
  const run = (days: DayKey[]) => days.map((d) => yes(d))

  it('counts consecutive successes up to yesterday; pending today does not break', () => {
    const reviews = run(['2026-11-08', '2026-11-09', '2026-11-10'])
    expect(currentStreak(h, reviews, TODAY)).toBe(3)
    expect(bestStreak(h, reviews, TODAY)).toBe(3)
  })

  it('a today review is ignored (today is never evaluated)', () => {
    expect(currentStreak(h, [yes('2026-11-10'), yes(TODAY)], TODAY)).toBe(1)
  })

  it('fail, tolerable and nodata reset; skipped is neutral', () => {
    const reviews = [
      yes('2026-11-02'),
      yes('2026-11-03'),
      yes('2026-11-04', false),
      yes('2026-11-05'),
      na('2026-11-06'),
      yes('2026-11-07'),
      unknown('2026-11-08'),
      yes('2026-11-09'),
      yes('2026-11-10'),
    ]
    expect(bestStreak(h, reviews, TODAY)).toBe(2)
    expect(currentStreak(h, reviews, TODAY)).toBe(2)
    const skipped = [yes('2026-11-05'), na('2026-11-06'), yes('2026-11-07'), yes('2026-11-08'), yes('2026-11-09'), yes('2026-11-10')]
    expect(currentStreak(h, skipped, TODAY)).toBe(5)
  })

  it('a missing yesterday breaks the current streak', () => {
    expect(currentStreak(h, [yes('2026-11-08'), yes('2026-11-09')], TODAY)).toBe(0)
  })

  it('empty history and habits starting today are 0', () => {
    expect(currentStreak(h, [], TODAY)).toBe(0)
    expect(bestStreak(habit({ effectiveFrom: TODAY }), [], TODAY)).toBe(0)
  })

  it('best is kept across a version change', () => {
    const rule = { kind: 'measured', unit: 'minutes', better: 'higher', excellent: 30 } as const
    const v = habit({ effectiveFrom: '2026-11-01', version: { from: '2026-11-01', rule } })
    v.versions.push({ from: '2026-11-06', tier: 'medium', rule: { ...rule, excellent: 60 } })
    const reviews = [
      val('2026-11-02', 40),
      val('2026-11-03', 40),
      val('2026-11-04', 40),
      val('2026-11-05', 40),
      val('2026-11-06', 40),
      val('2026-11-07', 70),
    ]
    expect(bestStreak(v, reviews, TODAY)).toBe(4)
  })
})

describe('completionPercent', () => {
  const h = habit({ effectiveFrom: '2026-10-01' })

  it('is null with nothing evaluated', () => {
    expect(completionPercent(h, [], TODAY)).toBeNull()
    expect(completionPercent(h, [na('2026-11-05'), na('2026-11-06')], TODAY)).toBeNull()
  })

  it('rounds success / evaluated over 30 days; skipped and missing excluded', () => {
    const reviews = [yes('2026-11-01'), yes('2026-11-02'), yes('2026-11-03', false), na('2026-11-04')]
    expect(completionPercent(h, reviews, TODAY)).toBe(67)
  })

  it('ignores reviews older than 30 days and today', () => {
    expect(completionPercent(h, [yes('2026-09-01', false), yes(TODAY, false), yes('2026-11-05')], TODAY)).toBe(100)
  })

  it('tolerable time counts as evaluated but not success', () => {
    const rule = { kind: 'measured', unit: 'time', better: 'lower', excellent: '07:00', tolerable: '07:30' } as const
    const t = habit({ effectiveFrom: '2026-10-01', version: { rule } })
    expect(completionPercent(t, [val('2026-11-05', '06:50'), val('2026-11-06', '07:20')], TODAY)).toBe(50)
  })
})

describe('weekdayPercent', () => {
  it('buckets Mon..Sun, null without evaluated days', () => {
    const h = habit({ effectiveFrom: '2026-11-01' })
    // 11-02 Mon success, 11-09 Mon fail, 11-03 Tue success
    const reviews = [yes('2026-11-02'), yes('2026-11-09', false), yes('2026-11-03')]
    const out = weekdayPercent(h, reviews, TODAY)
    expect(out).toHaveLength(7)
    expect(out[0]).toBe(50)
    expect(out[1]).toBe(100)
    expect(out[2]).toBeNull()
    expect(out[6]).toBeNull()
  })

  it('is all null for a brand new habit', () => {
    expect(weekdayPercent(habit({ effectiveFrom: TODAY }), [], TODAY)).toEqual(Array(7).fill(null))
  })
})

describe('weekly habits', () => {
  const goal = (perWeek: number, effectiveFrom = '2026-10-01') =>
    habit({ effectiveFrom, version: { weeklyGoal: { perWeek } } })

  it('weekResults counts events and gives verdicts', () => {
    const h = goal(3)
    const reviews = [
      yes('2026-11-02'),
      yes('2026-11-04'),
      yes('2026-11-06'),
      yes('2026-11-03', false),
      yes('2026-11-09'),
    ]
    const [prev, cur] = weekResults(h, reviews, '2026-11-02', TODAY, TODAY)
    expect(prev).toEqual({ weekStart: '2026-11-02', count: 3, target: 3, met: true })
    expect(cur).toMatchObject({ weekStart: '2026-11-09', count: 1, target: 3, met: null })
  })

  it('an ended week below target is not met; an ended week without data has no verdict', () => {
    const h = goal(3)
    const [w1, w2] = weekResults(h, [yes('2026-10-27'), yes('2026-10-28')], '2026-10-26', '2026-11-08', TODAY)
    expect(w1.met).toBe(false)
    expect(w2.met).toBeNull()
  })

  it('the running week is met as soon as the target is reached', () => {
    const h = goal(2)
    const reviews = [yes('2026-11-09'), yes('2026-11-10')]
    expect(weekResults(h, reviews, TODAY, TODAY, TODAY)[0].met).toBe(true)
  })

  it('the first partial week uses a pro-rated target', () => {
    // Tracked from Fri 11-06: 3 of 7 days -> ceil(4 * 3 / 7) = 2
    const h = goal(4, '2026-11-06')
    const reviews = [yes('2026-11-06'), yes('2026-11-07')]
    const [w] = weekResults(h, reviews, '2026-11-02', '2026-11-08', TODAY)
    expect(w).toMatchObject({ target: 2, count: 2, met: true })
  })

  it('weekStreaks: consecutive met weeks, running week only when met', () => {
    const h = goal(2)
    const met = (...days: DayKey[]) => days.map((d) => yes(d))
    const reviews = [
      ...met('2026-10-19', '2026-10-20'), // week of 10-19 met
      ...met('2026-10-26', '2026-10-27'), // met
      yes('2026-11-02'),
      yes('2026-11-03', false), // week of 11-02 not met
      ...met('2026-11-09'), // running, 1 of 2
    ]
    const s = weekStreaks(goal(2, '2026-10-19'), reviews, TODAY)
    expect(s).toEqual({ current: 0, best: 2 })
    const running = weekStreaks(goal(2, '2026-11-02'), [...met('2026-11-02', '2026-11-03'), ...met('2026-11-09', '2026-11-10')], TODAY)
    expect(running).toEqual({ current: 2, best: 2 })
    const pending = weekStreaks(goal(2, '2026-11-02'), [...met('2026-11-02', '2026-11-03'), ...met('2026-11-09')], TODAY)
    expect(pending).toEqual({ current: 1, best: 1 })
    expect(weekStreaks(h, [], TODAY)).toEqual({ current: 0, best: 0 })
  })

  it('destructive weekly: over the quota fails, running week is excluded from streaks', () => {
    const h = habit({
      direction: 'destructive',
      effectiveFrom: '2026-11-02',
      version: { quota: { perWeek: 1 } },
    })
    const slip = (d: DayKey) => yes(d, false)
    const hold = (d: DayKey) => yes(d, true)
    const reviews = [slip('2026-11-03'), hold('2026-11-04'), hold('2026-11-05'), hold('2026-11-06'), hold('2026-11-07'), hold('2026-11-08'), hold('2026-11-02')]
    const [prev, cur] = weekResults(h, reviews, '2026-11-02', TODAY, TODAY)
    expect(prev).toMatchObject({ count: 1, target: 1, met: true })
    expect(cur.met).toBeNull()
    expect(weekStreaks(h, [...reviews, slip('2026-11-09')], TODAY)).toEqual({ current: 1, best: 1 })
    expect(completionPercent(h, [...reviews, slip('2026-11-09'), slip('2026-11-10')], TODAY)).toBe(100)
  })

  it('completionPercent uses weeks, null when no verdicts', () => {
    expect(completionPercent(goal(2), [], TODAY)).toBeNull()
    const reviews = [yes('2026-11-02'), yes('2026-11-03'), yes('2026-10-26', false)]
    expect(completionPercent(goal(2), reviews, TODAY)).toBe(50)
  })
})
