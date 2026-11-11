// Core domain model. See LIFE_ELO_PRODUCT_CONTEXT.md §5–§9.

/** Local calendar day, `YYYY-MM-DD`. */
export type DayKey = string

export type HabitDirection = 'constructive' | 'destructive'

/** Confirmed: exactly three qualitative tiers. Numeric weights are TBD. */
export type ImpactTier = 'weak' | 'medium' | 'strong'

/** Derived from a measured value + habit rule + ruleset; never stored. */
export type Zone = 'excellent' | 'ok' | 'tolerable' | 'bad'

/** Scoring rule v1: boolean, or measured with inclusive thresholds on the good side. */
export type ZonedRule =
  | { kind: 'boolean' }
  | {
      kind: 'measured'
      unit: 'count' | 'minutes' | 'steps' | 'time'
      better: 'lower' | 'higher'
      excellent: number | string
      ok?: number | string
      /** When omitted, anything beyond `ok` (or `excellent`) is bad. */
      tolerable?: number | string
    }

/** Limits on a habit's count; `reducedByDaysOf` is another habit id (one level only). */
export interface Quota {
  perDay?: number
  perWeek?: number
  reducedByDaysOf?: string
}

/** Constructive yes/no goal: do the habit `perWeek` days (1-7) per calendar week (Mon-Sun). Ruleset v2. */
export interface WeeklyGoal {
  perWeek: number
}

/** Habit settings in effect from day `from` (inclusive). */
export interface HabitVersion {
  from: DayKey
  tier: ImpactTier
  rule: ZonedRule
  quota?: Quota
  weeklyGoal?: WeeklyGoal
}

export interface Habit {
  id: string
  name: string
  description?: string
  category?: string
  direction: HabitDirection
  /** Settings history, sorted by `from`, never empty. See `settingsOn`. */
  versions: HabitVersion[]
  rationale?: string
  active: boolean
  /** First day the habit is tracked. */
  effectiveFrom: DayKey
  /** Optional input link (prefill only); the engine ignores it. */
  source?: HabitSource
  createdAt: number
}

export type GarminMetric = 'steps' | 'bedtime' | 'wake' | 'activity'

/** Where a habit's review answer can be prefilled from. Not scoring. */
export interface HabitSource {
  kind: 'garmin'
  metric: GarminMetric
  /** Garmin activity type keys (metric `activity`). */
  activityTypes?: string[]
}

/** Garmin data for one calendar date (watch-local times). Raw record, synced from the server. */
export interface GarminDay {
  steps?: number
  /** Local `HH:MM` of the sleep that ends on this date. */
  sleepStart?: string
  sleepEnd?: string
  activities: { type: string; minutes: number }[]
}

/** A provisional log entry made during the day. Only confirmed reviews drive rating. */
export interface HabitEvent {
  id: string
  habitId: string
  day: DayKey
  /** Count, minutes, or `HH:MM` depending on the habit rule. */
  value?: number | string
  note?: string
  loggedAt: number
}

/** Measured review answer for one habit. */
export type HabitEntry =
  | { kind: 'value'; value: boolean | number | string }
  | { kind: 'not_applicable' }
  | { kind: 'unknown' }

export interface DayReview {
  day: DayKey
  entries: Record<string, HabitEntry>
  confirmedAt: number
  /** Increments on every correction of an already confirmed day. */
  revision: number
}

/** Optional 1–10 self-reported wellbeing. Never modifies Elo directly. */
export interface WellbeingCheckIn {
  day: DayKey
  mood?: number
  energy?: number
  clarity?: number
  confidence?: number
  impulseControl?: number
  note?: string
  createdAt: number
}

export interface Reward {
  id: string
  kind: 'wishlist' | 'unlock' | 'surprise'
  title: string
  description?: string
  priceEstimate?: number
  priority?: number
  status: 'locked' | 'available' | 'redeemed'
  createdAt: number
}
