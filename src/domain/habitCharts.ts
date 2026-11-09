// Pure chart data for the habit page (spec 12), built over `DayCell[]` from habitStats. Nothing is stored.
import { weekOf } from '../engine/weeklyGoal'
import { addDays, timeToMinutes } from './day'
import { chartKind, dayCells, habitNorms, weekResults, type DayCell, type HabitNorms } from './habitStats'
import type { DayKey, DayReview, Habit } from './types'

const WINDOW = 30
const MONTHS = 12
const WEEKS = 16
const HEAT_WEEKS = 53
const AVG_WINDOW = 28

const yesterdayOf = (today: DayKey) => addDays(today, -1)
const numberOf = (c: DayCell): number | undefined => (typeof c.value === 'number' ? c.value : undefined)
const minutesOf = (c: DayCell): number | null => {
  if (c.status === 'empty' || c.status === 'future' || typeof c.value !== 'string') return null
  const m = timeToMinutes(c.value)
  return Number.isNaN(m) ? null : m
}
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

// ---- amount (count / minutes / steps), last 30 days ------------------------------------------------

export type AmountState = 'met' | 'below' | 'within' | 'over' | 'nodata'

export interface AmountBar {
  day: DayKey
  value: number
  state: AmountState
}

export interface AmountSeries {
  bars: AmountBar[]
  /** Constructive goal per day (the dashed line); 0 when the habit has none. */
  target: number
  /** Destructive norm per day (the dashed line); 0 when the habit has none. */
  norm: number
  total: number
  previousTotal: number
  delta: number
  /** Delta is in the good direction (>= 0 constructive, <= 0 destructive). */
  better: boolean
}

function amountState(habit: Habit, line: number | undefined, value: number | undefined): AmountState {
  if (value === undefined) return 'nodata'
  if (habit.direction === 'constructive') return line === undefined || value >= line ? 'met' : 'below'
  return line === undefined || value <= line ? 'within' : 'over'
}

export function amountSeries(habit: Habit, reviews: DayReview[], today: DayKey): AmountSeries {
  const norms = habitNorms(habit, today)
  const constructive = habit.direction === 'constructive'
  const line = constructive ? norms.target : norms.limit
  const cells = dayCells(habit, reviews, addDays(today, -WINDOW), yesterdayOf(today), today)
  const prev = dayCells(habit, reviews, addDays(today, -2 * WINDOW), addDays(today, -WINDOW - 1), today)
  const total = sum(cells.map((c) => numberOf(c) ?? 0))
  const previousTotal = sum(prev.map((c) => numberOf(c) ?? 0))
  const delta = total - previousTotal
  return {
    bars: cells.map((c) => {
      const v = numberOf(c)
      return { day: c.day, value: v ?? 0, state: amountState(habit, line, v) }
    }),
    target: constructive ? (line ?? 0) : 0,
    norm: constructive ? 0 : (line ?? 0),
    total,
    previousTotal,
    delta,
    better: constructive ? delta >= 0 : delta <= 0,
  }
}

// ---- yes/no daily: 12 months ------------------------------------------------------------------------

export interface MonthCount {
  month: string
  count: number
  current: boolean
}

/** Done days (constructive) or slips (destructive) per month, oldest first, ending with the current month. */
export function monthlyCounts(habit: Habit, reviews: DayReview[], today: DayKey): MonthCount[] {
  const [y, m] = today.split('-').map(Number)
  const keys: string[] = []
  for (let k = MONTHS - 1; k >= 0; k--) {
    const d = new Date(y, m - 1 - k, 1)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const event = habit.direction === 'constructive' ? 'success' : 'fail'
  const counts = new Map(keys.map((k) => [k, 0]))
  for (const c of dayCells(habit, reviews, `${keys[0]}-01`, yesterdayOf(today), today)) {
    const key = c.day.slice(0, 7)
    if (c.status === event && counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return keys.map((month, i) => ({ month, count: counts.get(month) ?? 0, current: i === MONTHS - 1 }))
}

// ---- time ------------------------------------------------------------------------------------------

export type TimeZoneName = 'onTime' | 'tolerable' | 'late' | 'nodata'

export interface TimePoint {
  day: DayKey
  minutes: number | null
  zone: TimeZoneName
}

export interface TimeSeries {
  points: TimePoint[]
  /** Minutes (night-wrapped, see `timeToMinutes`); tolerable defaults to target + 30 (D2). */
  bounds: { target: number; tolerable: number }
  /** Percent of recorded points; all 0 when there are none. Sums to 100 otherwise. */
  share: { onTime: number; tolerable: number; late: number }
  avg4w: number | null
  avgPrev4w: number | null
  /** avg4w - avgPrev4w rounded; negative = earlier. `null` when either average is missing. */
  diffMinutes: number | null
}

const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : null)

export function timeSeries(habit: Habit, reviews: DayReview[], today: DayKey): TimeSeries {
  const norms = habitNorms(habit, today)
  const target = norms.target ?? 0
  const tolerable = norms.tolerableBound ?? target + 30
  const to = yesterdayOf(today)
  const zoneOf = (m: number): TimeZoneName => (m <= target ? 'onTime' : m <= tolerable ? 'tolerable' : 'late')
  const points = dayCells(habit, reviews, addDays(today, -WINDOW), to, today).map((c): TimePoint => {
    const minutes = minutesOf(c)
    return { day: c.day, minutes, zone: minutes === null ? 'nodata' : zoneOf(minutes) }
  })
  const recorded = points.filter((p) => p.minutes !== null)
  const pct = (z: TimeZoneName) =>
    recorded.length ? Math.round((recorded.filter((p) => p.zone === z).length / recorded.length) * 100) : 0
  const onTime = pct('onTime')
  const tol = pct('tolerable')
  const share = { onTime, tolerable: tol, late: recorded.length ? Math.max(0, 100 - onTime - tol) : 0 }
  const avgOf = (from: DayKey, end: DayKey) =>
    mean(
      dayCells(habit, reviews, from, end, today)
        .map(minutesOf)
        .filter((m): m is number => m !== null),
    )
  const avg4w = avgOf(addDays(today, -AVG_WINDOW), to)
  const avgPrev4w = avgOf(addDays(today, -2 * AVG_WINDOW), addDays(today, -AVG_WINDOW - 1))
  return {
    points,
    bounds: { target, tolerable },
    share,
    avg4w,
    avgPrev4w,
    diffMinutes: avg4w === null || avgPrev4w === null ? null : Math.round(avg4w - avgPrev4w),
  }
}

// ---- weekly yes/no: 16 weeks -----------------------------------------------------------------------

export interface WeekBar {
  weekStart: DayKey
  count: number
  norm: number
  met: boolean | null
}

export interface WeeklySeries {
  weeks: WeekBar[]
  /** Fixed bar scale (times per week). */
  scale: { min: 0; max: 7 }
}

export function weeklySeries(habit: Habit, reviews: DayReview[], today: DayKey): WeeklySeries {
  const from = addDays(weekOf(today), -7 * (WEEKS - 1))
  const weeks = weekResults(habit, reviews, from, today, today).map((w) => ({
    weekStart: w.weekStart,
    count: w.count,
    norm: w.target,
    met: w.met,
  }))
  return { weeks, scale: { min: 0, max: 7 } }
}

// ---- heatmap ---------------------------------------------------------------------------------------

export type HeatLevel = 'nodata' | 'future' | 0 | 1 | 2 | 3 | 4 | 'pos' | 'neg'

export interface HeatCell {
  day: DayKey
  level: HeatLevel
  /** Raw entry value for the tooltip (the UI formats it); absent without data. */
  tooltipValue?: boolean | number | string
}

export interface HeatWeek {
  weekStart: DayKey
  /** Mon..Sun. */
  days: HeatCell[]
  /** Weekly habits only: norm verdict for the strip under the column. */
  weekMet?: boolean | null
}

export interface HeatmapGrid {
  weeks: HeatWeek[]
  /** First column whose week contains the 1st of a month; `month` is `YYYY-MM`. */
  monthLabels: { column: number; month: string }[]
}

function amountLevel(direction: Habit['direction'], norms: HabitNorms, v: number): HeatLevel {
  if (direction === 'destructive') {
    const limit = norms.limit ?? norms.target
    if (v === 0) return 4
    if (limit === undefined) return 1
    return v <= limit / 2 ? 3 : v <= limit ? 2 : 1
  }
  if (v === 0) return 0
  const target = norms.target
  if (target === undefined || target <= 0) return 4
  const q = v / target
  return q < 0.5 ? 1 : q < 1 ? 2 : q < 1.5 ? 3 : 4
}

function cellLevel(habit: Habit, kind: ReturnType<typeof chartKind>, norms: HabitNorms, c: DayCell): HeatLevel {
  if (c.status === 'future') return 'future'
  if (c.status === 'empty' || c.status === 'skipped' || c.status === 'nodata') return 'nodata'
  if (kind === 'yesno') return c.status === 'success' ? 'pos' : 'neg'
  if (kind === 'weekly') {
    if (habit.direction === 'constructive') return c.status === 'success' ? 'pos' : 'nodata'
    return c.status === 'fail' ? 'neg' : 'nodata'
  }
  if (kind === 'time') {
    const m = minutesOf(c)
    if (m === null) return 'nodata'
    const off = m - (norms.target ?? 0)
    return off <= -30 ? 4 : off <= 0 ? 3 : off <= 30 ? 2 : 1
  }
  const v = numberOf(c)
  return v === undefined ? 'nodata' : amountLevel(habit.direction, norms, v)
}

export function heatmapGrid(habit: Habit, reviews: DayReview[], today: DayKey): HeatmapGrid {
  const kind = chartKind(habit, today)
  const norms = habitNorms(habit, today)
  const start = addDays(weekOf(today), -7 * (HEAT_WEEKS - 1))
  const cells = dayCells(habit, reviews, start, addDays(start, HEAT_WEEKS * 7 - 1), today)
  const verdicts =
    kind === 'weekly'
      ? new Map(weekResults(habit, reviews, start, today, today).map((w) => [w.weekStart, w.met]))
      : null
  const weeks: HeatWeek[] = []
  const monthLabels: HeatmapGrid['monthLabels'] = []
  for (let w = 0; w < HEAT_WEEKS; w++) {
    const col = cells.slice(w * 7, w * 7 + 7)
    const weekStart = col[0].day
    const first = col.find((c) => c.day.endsWith('-01'))
    if (first) monthLabels.push({ column: w, month: first.day.slice(0, 7) })
    const week: HeatWeek = {
      weekStart,
      days: col.map((c): HeatCell => {
        const level = cellLevel(habit, kind, norms, c)
        return level === 'nodata' || level === 'future' || c.value === undefined
          ? { day: c.day, level }
          : { day: c.day, level, tooltipValue: c.value }
      }),
    }
    if (verdicts) week.weekMet = verdicts.get(weekStart) ?? null
    weeks.push(week)
  }
  return { weeks, monthLabels }
}
