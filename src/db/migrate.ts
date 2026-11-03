import type { DayReview, Habit, HabitEntry, HabitVersion, ImpactTier, Quota, ZonedRule } from '../domain/types'

// Legacy stored shapes (before the v2 upgrade); only used to read old IndexedDB data.
type LegacyOutcome = 'done' | 'not_done' | 'complied' | 'violated' | 'not_applicable' | 'unknown'
type LegacyRule =
  | { kind: 'boolean' }
  | { kind: 'count'; limit: number }
  | { kind: 'minutes'; limit: number }
  | { kind: 'time'; notAfter: string }

/** A review as stored by v1: `outcomes`, or already `entries` (which win). */
export interface LegacyReview {
  day: string
  outcomes?: Record<string, LegacyOutcome>
  entries?: Record<string, HabitEntry>
  confirmedAt: number
  revision: number
}

/** A habit as stored by v1: top-level tier/rule/quota, `versions` possibly missing. */
export interface LegacyHabit extends Omit<Habit, 'versions'> {
  tier?: ImpactTier
  rule?: LegacyRule | ZonedRule
  quota?: Quota
  versions?: HabitVersion[]
}

function entryOfOutcome(outcome: LegacyOutcome): HabitEntry {
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

/** Legacy rules carry no zones; all are treated as plain boolean. */
function normalizeRule(rule: LegacyRule | ZonedRule | undefined): ZonedRule {
  return rule?.kind === 'measured' ? rule : { kind: 'boolean' }
}

/** Review with `entries` only (legacy `outcomes` dropped). Idempotent. */
export function migrateReview(review: LegacyReview): DayReview {
  const entries: Record<string, HabitEntry> = review.entries ?? {}
  if (!review.entries) {
    for (const [id, o] of Object.entries(review.outcomes ?? {})) entries[id] = entryOfOutcome(o)
  }
  return {
    day: review.day,
    entries,
    confirmedAt: review.confirmedAt,
    revision: review.revision,
  }
}

/** Ensures `versions[0]` exists, built from the top-level tier/rule/quota; drops those. Idempotent. */
export function migrateHabit(habit: LegacyHabit): Habit {
  const { tier, rule, quota, versions, ...rest } = habit
  if (versions && versions.length > 0) return { ...rest, versions }
  const version: HabitVersion = {
    from: habit.effectiveFrom,
    tier: tier ?? 'medium',
    rule: normalizeRule(rule),
  }
  if (quota) version.quota = quota
  return { ...rest, versions: [version] }
}
