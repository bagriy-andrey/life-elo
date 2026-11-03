import type { ImpactTier, Zone } from '../domain/types'

/**
 * Versioned ruleset (every ledger entry records its version). v1 shape. Numbers of `RULESET_V1` come literally from
 * LIFE_ELO_PRODUCT_CONTEXT.md §6.5 (agreed 2026-11-03).
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
  /** Days after the day itself during which it can still be reviewed. */
  reviewWindowDays: number
}

export const RULESET_V1: RulesetConfig = {
  version: 'v1',
  tierWeight: { weak: 1, medium: 2, strong: 3 },
  budget: { habitBase: 60, cleanDay: 20, streak: 20 },
  zoneShare: { excellent: 1, ok: 0.5, tolerable: 0, bad: -1 },
  streakFullDays: 7,
  softDecayFactor: 0.5,
  recoveryMinBadDays: 2,
  negativeMultipliers: [1, 1.25, 1.5],
  dayClamp: 100,
  eloRate: 0.1,
  eloScale: 10,
  reviewWindowDays: 1,
}
