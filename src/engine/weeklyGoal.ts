import { daysInWeekUpTo, weekStart } from '../domain/day'
import type { DayKey, Zone } from '../domain/types'
import type { RulesetConfig } from './config'

/** Monday of the calendar week containing `day` (the week key). */
export const weekOf = weekStart

/** Pro-rated weekly target for a habit tracked `activeDays` of 7 days: `ceil(N x activeDays / 7)` (min 0). */
export function weeklyTarget(perWeek: number, activeDays: number): number {
  return Math.ceil((perWeek * Math.min(Math.max(activeDays, 0), 7)) / 7)
}

/**
 * Zone of one day for a weekly-goal habit (П1/П3/П6.1): done = excellent (also beyond the target);
 * not done = not applicable while the target is still reachable (or already met), tolerable once it is not.
 * `doneBefore` counts done days Mon..day-1, `remainingAfter` tracked days after `day` in the week.
 */
export function weeklyGoalZone(args: {
  done: boolean
  doneBefore: number
  target: number
  remainingAfter: number
}): Extract<Zone, 'excellent' | 'tolerable'> | 'not_applicable' {
  if (args.done) return 'excellent'
  const needed = Math.max(args.target - args.doneBefore, 0)
  return needed <= args.remainingAfter ? 'not_applicable' : 'tolerable'
}

/** Progress for the UI: done days so far this week (incl. `day`) vs the pro-rated target. */
export function weeklyGoalProgress(perWeek: number, activeDays: number, doneDays: DayKey[], day: DayKey) {
  const week = new Set(daysInWeekUpTo(day))
  const done = new Set(doneDays.filter((d) => week.has(d))).size
  return { done, target: weeklyTarget(perWeek, activeDays) }
}

/** Week streak after a week ends: met -> +1, not met -> halved (floor), like a tolerable day (П4.2). */
export function finalizeWeek(base: number, met: boolean, cfg: Pick<RulesetConfig, 'softDecayFactor'>): number {
  return met ? base + 1 : Math.floor(base * cfg.softDecayFactor)
}

/** Days from `day` to the end of its week (Sunday), exclusive of `day`. */
export function daysLeftInWeek(day: DayKey): number {
  return 6 - (daysInWeekUpTo(day).length - 1)
}

