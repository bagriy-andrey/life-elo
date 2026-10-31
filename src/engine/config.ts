import type { ImpactTier } from '../domain/types'

/**
 * Versioned ruleset. Every ledger entry records the version it was computed with.
 *
 * ALL NUMBERS BELOW ARE PLACEHOLDERS so the engine can run end-to-end.
 * They are NOT agreed (see LIFE_ELO_PRODUCT_CONTEXT.md §12–§13) and must be
 * replaced once the user decides on weights, multipliers and caps.
 */
export interface RulesetConfig {
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

export const PLACEHOLDER_RULESET: RulesetConfig = {
  version: 'placeholder-0',
  tierWeight: { weak: 1, medium: 2, strong: 3 },
  compliedFactor: 0.5,
  cleanDayBonus: 2,
  streakStep: 0.1,
  streakMaxMultiplier: 2,
  dailyDeltaCap: 20,
  gapBreaksStreak: false,
}
