import type { DayKey } from './types'

/**
 * Hour before which local time still belongs to the previous day,
 * so a 00:30 bedtime counts towards the prior evening (§7).
 * Proposal, not a confirmed value.
 */
export const DAY_BOUNDARY_HOUR = 4

const pad = (n: number) => String(n).padStart(2, '0')

export function toDayKey(date: Date): DayKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Day a moment belongs to, honouring the night-time boundary. */
export function dayOf(moment: Date, boundaryHour = DAY_BOUNDARY_HOUR): DayKey {
  const shifted = new Date(moment)
  shifted.setHours(shifted.getHours() - boundaryHour)
  return toDayKey(shifted)
}

export function addDays(day: DayKey, delta: number): DayKey {
  const [y, m, d] = day.split('-').map(Number)
  return toDayKey(new Date(y, m - 1, d + delta))
}

/** The day that the morning review finalizes. */
export function reviewDay(now: Date): DayKey {
  return addDays(dayOf(now), -1)
}

const parseDay = (day: DayKey) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Monday of the week containing `day`. */
export function weekStart(day: DayKey): DayKey {
  const dow = parseDay(day).getDay() // 0 = Sunday
  return addDays(day, -((dow + 6) % 7))
}

/** Inclusive list of days from `from` to `to` (empty if from > to). */
export function eachDay(from: DayKey, to: DayKey): DayKey[] {
  const out: DayKey[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

/** Days of the Mon–Sun week from Monday up to and including `day`. */
export function daysInWeekUpTo(day: DayKey): DayKey[] {
  return eachDay(weekStart(day), day)
}

/** A day is locked once review of the day is no longer possible (D+2 after the boundary hour). */
export function isDayLocked(day: DayKey, now: Date, boundaryHour = DAY_BOUNDARY_HOUR): boolean {
  return dayOf(now, boundaryHour) > addDays(day, 1)
}

/** "HH:MM" -> minutes; times before the boundary hour count as 24h+ (00:30 = 1470). */
export function timeToMinutes(hhmm: string, boundaryHour = DAY_BOUNDARY_HOUR): number {
  const [h, m] = hhmm.split(':').map(Number)
  const minutes = h * 60 + m
  return h < boundaryHour ? minutes + 24 * 60 : minutes
}
