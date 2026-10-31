// Core domain model. See LIFE_ELO_PRODUCT_CONTEXT.md §5–§9.

/** Local calendar day, `YYYY-MM-DD`. */
export type DayKey = string

export type HabitDirection = 'constructive' | 'destructive'

/** Confirmed: exactly three qualitative tiers. Numeric weights are TBD. */
export type ImpactTier = 'weak' | 'medium' | 'strong'

/** How success / violation is measured. */
export type HabitRule =
  | { kind: 'boolean' }
  | { kind: 'count'; limit: number }
  | { kind: 'minutes'; limit: number }
  /** Time of day `HH:MM`; e.g. bedtime "not after 23:00". */
  | { kind: 'time'; notAfter: string }

export interface Habit {
  id: string
  name: string
  description?: string
  category?: string
  direction: HabitDirection
  tier: ImpactTier
  rule: HabitRule
  rationale?: string
  active: boolean
  /** First day the habit is tracked. */
  effectiveFrom: DayKey
  createdAt: number
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

/**
 * Per-habit result recorded during the next-morning review.
 * - constructive: `done` / `not_done` (not_done is neutral)
 * - destructive: `complied` / `violated`
 * - any: `not_applicable` / `unknown`
 */
export type HabitOutcome =
  | 'done'
  | 'not_done'
  | 'complied'
  | 'violated'
  | 'not_applicable'
  | 'unknown'

export interface DayReview {
  day: DayKey
  outcomes: Record<string, HabitOutcome>
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
