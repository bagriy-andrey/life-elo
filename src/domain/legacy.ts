import type {
  DayKey,
  DayReview,
  Habit,
  HabitEntry,
  HabitOutcome,
  HabitRule,
  HabitVersion,
  ZonedRule,
} from './types'

/** Legacy rules carry no zones; all are treated as plain boolean. */
export function normalizeRule(rule: HabitRule | ZonedRule): ZonedRule {
  return rule.kind === 'measured' ? rule : { kind: 'boolean' }
}

function entryOfOutcome(outcome: HabitOutcome): HabitEntry {
  switch (outcome) {
    case 'done':
    case 'complied':
      return { kind: 'value', value: true }
    case 'not_done':
    case 'violated':
      return { kind: 'value', value: false }
    case 'not_applicable':
      return { kind: 'not_applicable' }
    default:
      return { kind: 'unknown' }
  }
}

/** Review answers as entries; `entries` wins over legacy `outcomes`. */
export function entriesOf(review: DayReview): Record<string, HabitEntry> {
  if (review.entries) return review.entries
  const result: Record<string, HabitEntry> = {}
  for (const [id, outcome] of Object.entries(review.outcomes ?? {})) {
    result[id] = entryOfOutcome(outcome)
  }
  return result
}

/** Settings in effect for `habit` on `day` (days before the first version use the first). */
export function settingsOn(habit: Habit, day: DayKey): HabitVersion {
  const versions = habit.versions
  if (!versions || versions.length === 0) {
    return {
      from: habit.effectiveFrom,
      tier: habit.tier,
      rule: normalizeRule(habit.rule),
      quota: habit.quota,
    }
  }
  let current = versions[0]
  for (const v of versions) {
    if (v.from <= day) current = v
    else break
  }
  return current
}
