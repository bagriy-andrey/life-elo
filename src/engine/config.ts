import type { ImpactTier } from '../domain/types'

/**
 * Versioned ruleset. Every ledger entry records the version it was computed with.
 *
 * ALL NUMBERS BELOW ARE PLACEHOLDERS so the engine can run end-to-end.
 * They are NOT agreed (see LIFE_ELO_PRODUCT_CONTEXT.md §12–§13) and must be
 * replaced once the user decides on weights, multipliers and caps.
 */
export interface LegacyRulesetConfig {
  version: string
  /** Base magnitude per tier, applied to done / complied (+) and violated (−). */
  tierWeight: Record<ImpactTier, number>
  /** Fraction of the tier weight earned for observing a destructive limit. */
  compliedFactor: number
  /** Bonus when every applicable destructive habit was complied with. */
  cleanDayBonus: number
  /** Extra multiplier per consecutive day of the same streak sign… */
  streakStep: number
  /** …bounded by this cap, to avoid runaway scores or spirals. */
  streakMaxMultiplier: number
  /** Hard cap on |daily delta|. */
  dailyDeltaCap: number
  /** Whether an unconfirmed day between two confirmed ones resets streaks. */
  gapBreaksStreak: boolean
}

/** Zone of a habit's outcome for one day. */
export type ZoneKey = 'excellent' | 'ok' | 'tolerable' | 'bad'

/**
 * Ruleset v1 shape. Numbers of `RULESET_V1` come literally from
 * LIFE_ELO_PRODUCT_CONTEXT.md §6.5 (agreed 2026-11-03).
 */
export interface RulesetConfig {
  version: string
  tierWeight: Record<ImpactTier, number>
  /** Day score budget: habitBase + cleanDay + streak = 100. */
  budget: { habitBase: number; cleanDay: number; streak: number }
  /** Share of `weight x unit` per zone (bad is negative, before the negative-streak multiplier). */
  zoneShare: Record<ZoneKey, number>
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

export const PLACEHOLDER_RULESET: LegacyRulesetConfig & RulesetConfig = {
  ...RULESET_V1,
  version: 'placeholder-0',
  tierWeight: { weak: 1, medium: 2, strong: 3 },
  compliedFactor: 0.5,
  cleanDayBonus: 2,
  streakStep: 0.1,
  streakMaxMultiplier: 2,
  dailyDeltaCap: 20,
  gapBreaksStreak: false,
}
