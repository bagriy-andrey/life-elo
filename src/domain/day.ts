import type { DayKey } from './types'

/** Bedtimes before this hour compare as late evening (00:30 = 24:30). Only used by `timeToMinutes`. */
const NIGHT_WRAP_HOUR = 4

const pad = (n: number) => String(n).padStart(2, '0')

export function toDayKey(date: Date): DayKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Day a moment belongs to: the local calendar day (boundary at 00:00). */
export function dayOf(moment: Date): DayKey {
  return toDayKey(moment)
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

/** A day is locked once review of the day is no longer possible (from 00:00 of D+2). */
export function isDayLocked(day: DayKey, now: Date): boolean {
  return dayOf(now) > addDays(day, 1)
}

/** "HH:MM" -> minutes; times before 04:00 count as 24h+ (00:30 = 1470). */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  const minutes = h * 60 + m
  return h < NIGHT_WRAP_HOUR ? minutes + 24 * 60 : minutes
}
