import { daysInWeekUpTo } from '../domain/day'
import type { DayKey, Habit, HabitEntry, Quota, Zone } from '../domain/types'

type DayEntries = Record<string, HabitEntry | undefined>

/** Habit settings relevant to quotas (use `settingsOn(habit, day).quota`). */
export type QuotaHabit = Pick<Habit, 'id'> & { quota?: Quota }

/** Count carried by an entry; N/A, unknown and missing add nothing. */
function countOf(entry: HabitEntry | undefined): number {
  if (!entry || entry.kind !== 'value') return 0
  const v = entry.value
  if (typeof v === 'number') return v
  return v === true ? 1 : 0
}

/** Reducer habit "active" that day: boolean true, or count > 0. */
function isActive(entry: HabitEntry | undefined): boolean {
  return countOf(entry) > 0
}

/**
 * Zone of a quota habit for `day`: `bad` if the day count exceeds `perDay`, or the cumulative week
 * count (Mon..day inclusive) exceeds the weekly limit as reduced by days up to `day` on which the
 * `reducedByDaysOf` habit was active (floored at 0); otherwise `ok`. Only days Mon..`day` are read,
 * so later days never re-score earlier ones. `null` when no quota or the day's entry has no count.
 *
 * `entriesByDay` maps day -> that day's entries (habitId -> entry).
 */
export function quotaZone(
  habit: QuotaHabit,
  day: DayKey,
  entriesByDay: Record<DayKey, DayEntries | undefined>,
): Zone | null {
  const { quota } = habit
  if (!quota) return null
  const today = entriesByDay[day]?.[habit.id]
  if (!today || today.kind !== 'value' || typeof today.value === 'string') return null
  if (quota.perDay !== undefined && countOf(today) > quota.perDay) return 'bad'
  if (quota.perWeek !== undefined) {
    const days = daysInWeekUpTo(day)
    const total = days.reduce((sum, d) => sum + countOf(entriesByDay[d]?.[habit.id]), 0)
    const reducer = quota.reducedByDaysOf
    const reduction = reducer ? days.filter((d) => isActive(entriesByDay[d]?.[reducer])).length : 0
    if (total > Math.max(0, quota.perWeek - reduction)) return 'bad'
  }
  return 'ok'
}

/**
 * Weekly usage for the review UI: count used on Mon..`day`-1 (excluding `day` itself) and the
 * effective limit `max(0, perWeek - reducerActiveDays)` over the same days. Same helpers as
 * `quotaZone`. `null` when the habit has no weekly quota. Pass confirmed days only.
 */
export function weeklyQuotaUsage(
  habit: QuotaHabit,
  day: DayKey,
  entriesByDay: Record<DayKey, DayEntries | undefined>,
): { used: number; limit: number } | null {
  const perWeek = habit.quota?.perWeek
  if (perWeek === undefined) return null
  const days = daysInWeekUpTo(day).slice(0, -1)
  const used = days.reduce((sum, d) => sum + countOf(entriesByDay[d]?.[habit.id]), 0)
  const reducer = habit.quota?.reducedByDaysOf
  const reduction = reducer ? days.filter((d) => isActive(entriesByDay[d]?.[reducer])).length : 0
  return { used, limit: Math.max(0, perWeek - reduction) }
}
