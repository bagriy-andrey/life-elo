// Bars for «По дням недели»: height ratio, optional label above, fill colour. Pure; WeekdayBars renders them.
import { amountHeatLevel, heatTone, timeZoneOf } from '../../domain/habitCharts'
import type { HabitNorms } from '../../domain/habitStats'
import type { Habit } from '../../domain/types'

export type WeekdayFill = 'best' | 'dim' | 'pos' | 'warn' | 'neg' | `${'pos' | 'neg'}${1 | 2 | 3 | 4}`

export interface WeekdayBar {
  /** 0..1 of the track height; `null` = no data (empty track). */
  ratio: number | null
  label?: string
  fill: WeekdayFill
}

/** Height = % successful days; the best weekday is bright, the rest dimmed. Labels «80%» only when asked. */
export function percentBars(percents: (number | null)[], withLabels: boolean): WeekdayBar[] {
  const max = Math.max(0, ...percents.map((p) => p ?? 0))
  return percents.map((p) => ({
    ratio: p === null ? null : p / 100,
    label: withLabels ? (p === null ? '—' : `${p}%`) : undefined,
    fill: p !== null && p === max && max > 0 ? 'best' : 'dim',
  }))
}

/** Time: height = % successful days, label = average time, colour = zone of that average. */
export function timeBars(
  percents: (number | null)[],
  averages: (number | null)[],
  norms: HabitNorms,
  format: (minutes: number) => string,
): WeekdayBar[] {
  return percents.map((p, i) => {
    const avg = averages[i]
    if (avg === null) return { ratio: p === null ? null : p / 100, label: '—', fill: 'dim' }
    const zone = timeZoneOf(norms, Math.round(avg))
    return {
      ratio: (p ?? 0) / 100,
      label: format(Math.round(avg)),
      fill: zone === 'onTime' ? 'pos' : zone === 'tolerable' ? 'warn' : 'neg',
    }
  })
}

/** Minutes / count: height = average relative to the busiest weekday, shade = heatmap level of the average. */
export function amountBars(
  averages: (number | null)[],
  habit: Habit,
  norms: HabitNorms,
  format: (value: number) => string,
): WeekdayBar[] {
  const max = Math.max(0, ...averages.map((a) => a ?? 0))
  const tone = heatTone(habit, norms)
  return averages.map((avg) => {
    if (avg === null) return { ratio: null, label: '—', fill: 'dim' }
    const level = Math.max(1, amountHeatLevel(habit, norms, avg)) as 1 | 2 | 3 | 4
    return { ratio: max > 0 ? avg / max : 0, label: format(avg), fill: `${tone}${level}` }
  })
}
