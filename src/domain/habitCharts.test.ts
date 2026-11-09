import { describe, expect, it } from 'vitest'
import { amountSeries, heatmapGrid, monthlyCounts, timeSeries, weeklySeries } from './habitCharts'
import type { DayKey, DayReview, Habit, HabitEntry, HabitVersion } from './types'

// 2026-11-11 is a Wednesday.
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
const val = (day: DayKey, v: boolean | number | string) => review(day, { kind: 'value', value: v })

const minutes = (direction: Habit['direction'] = 'constructive') =>
  habit({
    direction,
    version: {
      rule:
        direction === 'constructive'
          ? { kind: 'measured', unit: 'minutes', better: 'higher', excellent: 60 }
          : { kind: 'measured', unit: 'minutes', better: 'lower', excellent: 0, ok: 30, tolerable: 45 },
    },
  })
const timeHabit = (tolerable?: string) =>
  habit({
    version: {
      rule: { kind: 'measured', unit: 'time', better: 'lower', excellent: '22:30', ...(tolerable ? { tolerable } : {}) },
    },
  })

const cellLevel = (g: ReturnType<typeof heatmapGrid>, d: DayKey) =>
  g.weeks.flatMap((w) => w.days).find((c) => c.day === d)?.level

describe('amountSeries', () => {
  it('constructive: 30 bars, states, totals and delta direction', () => {
    const h = minutes()
    const s = amountSeries(h, [val('2026-11-10', 60), val('2026-11-09', 20), val('2026-10-05', 10)], TODAY)
    expect(s.bars).toHaveLength(30)
    expect(s.bars[29]).toEqual({ day: '2026-11-10', value: 60, state: 'met' })
    expect(s.bars[28].state).toBe('below')
    expect(s.bars[0].state).toBe('nodata')
    expect(s.target).toBe(60)
    expect(s.total).toBe(80)
    expect(s.previousTotal).toBe(10)
    expect(s.delta).toBe(70)
    expect(s.better).toBe(true)
    expect(amountSeries(h, [val('2026-10-05', 100)], TODAY).better).toBe(false)
  })
  it('destructive: within/over and lower is better', () => {
    const h = minutes('destructive')
    const s = amountSeries(h, [val('2026-11-10', 10), val('2026-11-09', 90), val('2026-10-05', 100)], TODAY)
    expect(s.bars[29].state).toBe('within')
    expect(s.bars[28].state).toBe('over')
    expect(s.norm).toBe(45)
    expect(s.total).toBe(100)
    expect(s.previousTotal).toBe(100)
    expect(s.better).toBe(true)
    expect(amountSeries(h, [val('2026-11-10', 99)], TODAY).better).toBe(false)
  })
})

describe('monthlyCounts', () => {
  it('counts done days for constructive, slips for destructive; 12 months, current flagged', () => {
    const reviews = [val('2026-11-10', true), val('2026-11-09', false), val('2026-10-01', true)]
    const c = monthlyCounts(habit({}), reviews, TODAY)
    expect(c).toHaveLength(12)
    expect(c[0].month).toBe('2025-12')
    expect(c[11]).toEqual({ month: '2026-11', count: 1, current: true })
    expect(c[10].count).toBe(1)
    const d = monthlyCounts(habit({ direction: 'destructive' }), reviews, TODAY)
    expect(d[11].count).toBe(1)
    expect(d[10].count).toBe(0)
  })
})

describe('timeSeries', () => {
  it('zones, share, averages and diff with an explicit tolerable bound', () => {
    const reviews = [
      val('2026-11-10', '22:00'),
      val('2026-11-09', '23:00'),
      val('2026-11-08', '23:30'),
      val('2026-11-07', '22:30'),
      val('2026-10-05', '23:00'),
    ]
    const s = timeSeries(timeHabit('23:00'), reviews, TODAY)
    expect(s.points).toHaveLength(30)
    expect(s.bounds).toEqual({ target: 22 * 60 + 30, tolerable: 23 * 60 })
    expect(s.points[29]).toMatchObject({ minutes: 22 * 60, zone: 'onTime' })
    expect(s.points[28].zone).toBe('tolerable')
    expect(s.points[27].zone).toBe('late')
    expect(s.points[0].zone).toBe('nodata')
    expect(s.share).toEqual({ onTime: 50, tolerable: 25, late: 25 })
    expect(s.avg4w).toBeCloseTo((22 * 60 + 23 * 60 + 23 * 60 + 30 + 22 * 60 + 30) / 4)
    expect(s.avgPrev4w).toBe(23 * 60)
    expect(s.diffMinutes).toBe(Math.round((s.avg4w ?? 0) - 23 * 60))
  })
  it('defaults tolerable to target + 30 and handles no data', () => {
    const s = timeSeries(timeHabit(), [], TODAY)
    expect(s.bounds.tolerable).toBe(22 * 60 + 60)
    expect(s.share).toEqual({ onTime: 0, tolerable: 0, late: 0 })
    expect(s.avg4w).toBeNull()
    expect(s.diffMinutes).toBeNull()
  })
})

describe('weeklySeries', () => {
  const weeklyHabit = (direction: Habit['direction']) =>
    habit(
      direction === 'constructive'
        ? { version: { weeklyGoal: { perWeek: 2 } } }
        : { direction, version: { quota: { perWeek: 1 } } },
    )
  it('16 weeks, scale 0-7, constructive met', () => {
    const s = weeklySeries(weeklyHabit('constructive'), [val('2026-11-02', true), val('2026-11-04', true)], TODAY)
    expect(s.weeks).toHaveLength(16)
    expect(s.scale).toEqual({ min: 0, max: 7 })
    expect(s.weeks[14]).toEqual({ weekStart: '2026-11-02', count: 2, norm: 2, met: true })
    expect(s.weeks[15].weekStart).toBe('2026-11-09')
  })
  it('destructive: over norm is not met', () => {
    const s = weeklySeries(weeklyHabit('destructive'), [val('2026-11-02', false), val('2026-11-03', false)], TODAY)
    expect(s.weeks[14]).toMatchObject({ count: 2, norm: 1, met: false })
  })
})

describe('heatmapGrid', () => {
  it('is 53 Monday-aligned columns of 7 days with future days marked', () => {
    const g = heatmapGrid(habit({}), [val('2026-11-10', true)], TODAY)
    expect(g.weeks).toHaveLength(53)
    for (const w of g.weeks) expect(w.days).toHaveLength(7)
    const last = g.weeks[52]
    expect(last.weekStart).toBe('2026-11-09')
    expect(last.days[0].day).toBe('2026-11-09')
    expect(last.days[1].level).toBe('pos')
    expect(last.days[1].tooltipValue).toBe(true)
    expect(last.days[2].level).toBe('future')
    expect(last.days[6].level).toBe('future')
    expect(g.weeks[0].weekStart).toBe('2025-11-10')
    expect(g.monthLabels.at(-1)).toEqual({ column: 50, month: '2026-11' })
    expect(g.weeks[52].weekMet).toBeUndefined()
  })
  it('yes/no: destructive slip is neg, held is pos', () => {
    const g = heatmapGrid(habit({ direction: 'destructive' }), [val('2026-11-10', false), val('2026-11-09', true)], TODAY)
    expect(g.weeks[52].days[1].level).toBe('neg')
    expect(g.weeks[52].days[0].level).toBe('pos')
  })
  it('amount levels, constructive and destructive', () => {
    const rs = [val('2026-11-09', 0), val('2026-11-10', 20), val('2026-11-08', 45), val('2026-11-07', 70), val('2026-11-06', 100)]
    const g = heatmapGrid(minutes(), rs, TODAY)
    expect(['2026-11-09', '2026-11-10', '2026-11-08', '2026-11-07', '2026-11-06'].map((d) => cellLevel(g, d))).toEqual([
      0, 1, 2, 3, 4,
    ])
    const ds = [val('2026-11-09', 0), val('2026-11-10', 20), val('2026-11-08', 40), val('2026-11-07', 99)]
    const gd = heatmapGrid(minutes('destructive'), ds, TODAY)
    expect(['2026-11-09', '2026-11-10', '2026-11-08', '2026-11-07'].map((d) => cellLevel(gd, d))).toEqual([4, 3, 2, 1])
  })
  it('time levels by deviation from target', () => {
    const rs = [val('2026-11-09', '21:50'), val('2026-11-10', '22:20'), val('2026-11-08', '22:50'), val('2026-11-07', '23:30')]
    const g = heatmapGrid(timeHabit('23:00'), rs, TODAY)
    expect(['2026-11-09', '2026-11-10', '2026-11-08', '2026-11-07'].map((d) => cellLevel(g, d))).toEqual([4, 3, 2, 1])
  })
  it('weekly: only event days coloured, weekMet per column', () => {
    const h = habit({ version: { weeklyGoal: { perWeek: 1 } } })
    const g = heatmapGrid(h, [val('2026-11-10', true), val('2026-11-09', false)], TODAY)
    expect(g.weeks[52].days[1].level).toBe('pos')
    expect(g.weeks[52].days[0].level).toBe('nodata')
    expect(g.weeks[52].weekMet).toBe(true)
    expect(g.weeks[51].weekMet).toBeNull()
  })
})
