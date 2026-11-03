import { entriesOf, normalizeRule } from '../domain/legacy'
import type { DayReview, Habit, HabitEntry } from '../domain/types'

/** Stored review shape after v2: `entries` only (legacy `outcomes` dropped). */
export type StoredReview = Omit<DayReview, 'outcomes' | 'entries'> & {
  entries: Record<string, HabitEntry>
}

export function migrateReview(review: DayReview): StoredReview {
  return {
    day: review.day,
    entries: entriesOf(review),
    confirmedAt: review.confirmedAt,
    revision: review.revision,
  }
}

/** Ensures `versions[0]` exists, built from the top-level tier/rule/quota. Idempotent. */
export function migrateHabit(habit: Habit): Habit {
  if (habit.versions && habit.versions.length > 0) return habit
  const version: NonNullable<Habit['versions']>[number] = {
    from: habit.effectiveFrom,
    tier: habit.tier,
    rule: normalizeRule(habit.rule),
  }
  if (habit.quota) version.quota = habit.quota
  return { ...habit, versions: [version] }
}
