import type { ImpactTier, Zone } from '../domain/types'

/**
 * Versioned ruleset (every ledger entry records its version). Numbers of `RULESET_V1` come literally from
 * LIFE_ELO_PRODUCT_CONTEXT.md §6.5 (agreed 2026-11-03; v1.1 tier streak start agreed 2026-11-04, applied to all history).
 */
export interface RulesetConfig {
  version: string
  tierWeight: Record<ImpactTier, number>
  /** Day score budget: habitBase + cleanDay + streak = 100. */
  budget: { habitBase: number; cleanDay: number; streak: number }
  /** Share of `weight x unit` per zone (bad is negative, before the negative-streak multiplier). */
  zoneShare: Record<Zone, number>
  /** Streak length at which the streak bonus is full. */
  streakFullDays: number
  /** First streak day that earns a bonus, per tier; it then grows in equal steps up to `streakFullDays`. */
  streakStartDay: Record<ImpactTier, number>
  /** Positive streak is multiplied by this (then floored) on a tolerable day. */
  softDecayFactor: number
  /** Consecutive bad days needed before the first ok day counts as recovery (full weight). */
  recoveryMinBadDays: number
  /** Multiplier by consecutive bad day: 1st, 2nd, 3rd and later. */
  negativeMultipliers: number[]
  /** Day score is clamped to +-dayClamp. */
  dayClamp: number
  /** R += eloRate x (eloScale x S - R). */
  eloRate: number
  eloScale: number
  /** Weekly-goal streak bonus share by tier; index `min(week, len) - 1`, week 0 earns nothing. */
  weeklyStreakFraction: Record<ImpactTier, number[]>
  /** Label of days that use no v2 feature (history stays labelled with the older ruleset). Defaults to `version`. */
  baseVersion?: string
  /** Days after the day itself during which it can still be reviewed. */
  reviewWindowDays: number
}

export const RULESET_V1: RulesetConfig = {
  version: 'v1.1',
  tierWeight: { weak: 1, medium: 2, strong: 3 },
  budget: { habitBase: 60, cleanDay: 20, streak: 20 },
  zoneShare: { excellent: 1, ok: 0.5, tolerable: 0, bad: -1 },
  streakFullDays: 7,
  streakStartDay: { strong: 3, medium: 5, weak: 7 },
  softDecayFactor: 0.5,
  recoveryMinBadDays: 2,
  negativeMultipliers: [1, 1.25, 1.5],
  dayClamp: 100,
  eloRate: 0.1,
  eloScale: 10,
  reviewWindowDays: 1,
  weeklyStreakFraction: { strong: [1], medium: [0.5, 1], weak: [0, 1] },
}

/** v2 = v1.1 numbers + constructive weekly goal semantics (they only trigger for habits with `weeklyGoal`). */
export const RULESET_V2: RulesetConfig = { ...RULESET_V1, version: 'v2', baseVersion: RULESET_V1.version }
