import { isDayLocked } from '../domain/day'
import type { DayReview, HabitEntry } from '../domain/types'

export class DayLockedError extends Error {
  constructor(day: string) {
    super(`Day ${day} is locked`)
    this.name = 'DayLockedError'
  }
}

/** Pure core of `confirmDay`: rejects locked days, bumps revision on corrections. */
export function buildReview(
  day: string,
  entries: Record<string, HabitEntry>,
  now: Date,
  existing?: Pick<DayReview, 'revision'>,
): DayReview {
  if (isDayLocked(day, now)) throw new DayLockedError(day)
  return {
    day,
    entries,
    confirmedAt: now.getTime(),
    revision: (existing?.revision ?? 0) + 1,
  }
}
