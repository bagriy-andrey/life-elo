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
