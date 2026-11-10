// Bars for the last 7 days (today is the last one): height ratio, optional label above, fill colour.
// Pure; WeekdayBars renders them. Today is not reviewed yet, so its bar is empty.
import { addDays, timeToMinutes } from '../../domain/day'
import { amountHeatLevel, heatTone, timeZoneOf } from '../../domain/habitCharts'
import type { ChartKind, DayCell, HabitNorms } from '../../domain/habitStats'
import type { DayKey, Habit } from '../../domain/types'

export const HISTORY_DAYS = 7

export type WeekdayFill = 'dim' | 'pos' | 'warn' | 'neg' | `${'pos' | 'neg'}${1 | 2 | 3 | 4}`

export interface WeekdayBar {
  day: DayKey
  /** 0..1 of the track height; `null` = no data (empty track). */
  ratio: number | null
  label?: string
  fill: WeekdayFill
}

/** First day of the 7-day window ending today. */
export const historyFrom = (today: DayKey) => addDays(today, -(HISTORY_DAYS - 1))

const empty = (day: DayKey, label?: string): WeekdayBar => ({ day, ratio: null, label, fill: 'dim' })

/** Yes/no: a full bar green for a successful day, red for a miss / slip. Weekly: only event days are coloured. */
export function outcomeBars(cells: DayCell[], kind: ChartKind, direction: Habit['direction']): WeekdayBar[] {
  return cells.map((c) => {
    if (kind === 'weekly') {
      if (direction === 'constructive' && c.status === 'success') return { day: c.day, ratio: 1, fill: 'pos' }
      if (direction === 'destructive' && c.status === 'fail') return { day: c.day, ratio: 1, fill: 'neg' }
      return empty(c.day)
    }
    if (c.status === 'success') return { day: c.day, ratio: 1, fill: 'pos' }
    if (c.status === 'fail') return { day: c.day, ratio: 1, fill: 'neg' }
    return empty(c.day)
  })
}

/** Time: a full bar in the zone colour (on time / tolerable / late), the time above it. */
export function timeBars(cells: DayCell[], norms: HabitNorms, format: (minutes: number) => string): WeekdayBar[] {
  return cells.map((c) => {
    const m = typeof c.value === 'string' ? timeToMinutes(c.value) : NaN
    if (!Number.isFinite(m)) return empty(c.day, '—')
    const zone = timeZoneOf(norms, m)
    return { day: c.day, ratio: 1, label: format(m), fill: zone === 'onTime' ? 'pos' : zone === 'tolerable' ? 'warn' : 'neg' }
  })
}

/** Minutes / count: height relative to the biggest day of the 7, shade = heatmap level of the value. */
export function amountBars(
  cells: DayCell[],
  habit: Habit,
  norms: HabitNorms,
  format: (value: number) => string,
): WeekdayBar[] {
  const values = cells.map((c) => (typeof c.value === 'number' ? c.value : null))
  const max = Math.max(0, ...values.map((v) => v ?? 0))
  const tone = heatTone(habit, norms)
  return cells.map((c, i) => {
    const v = values[i]
    if (v === null) return empty(c.day, '—')
    const level = Math.max(1, amountHeatLevel(habit, norms, v)) as 1 | 2 | 3 | 4
    return { day: c.day, ratio: max > 0 ? v / max : 0, label: format(v), fill: `${tone}${level}` }
  })
}
