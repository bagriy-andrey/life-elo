import type { ImpactTier, Zone } from '../domain/types'
import type { RulesetConfig } from './config'
import { EMPTY_STREAK, advanceStreak, breakStreak, isRecovery, negativeMultiplier } from './streaks'
import type { StreakState } from './streaks'

/** A habit as seen by one scored day (settings already resolved via `settingsOn`). */
export interface DayHabit {
  id: string
  tier: ImpactTier
  /** Destructive or quota habit; constructive habits never take part in the clean day. */
  canBeBad: boolean
  /** Weekly-goal habit: its streak counts weeks (`weekStreak` AFTER this day) and is managed by `replay`. */
  weekly?: { weekStreak: number }
}

/** Result of one habit on one day. `unknown` stays in the weight sum, `not_applicable` leaves it. */
export type DayZone = Zone | 'unknown' | 'not_applicable'

export type ContributionSource = 'habit' | 'clean_day' | 'streak_bonus'

export interface DayContribution {
  source: ContributionSource
  habitId?: string
  zone?: DayZone
  points: number
  /** Negative-streak multiplier for bad days; 1 for everything else. */
  multiplier: number
}

export interface DayScoreInput {
  habits: DayHabit[]
  zones: Record<string, DayZone>
  /** Streaks BEFORE this day; missing = empty. */
  streaks: Record<string, StreakState>
  cfg: RulesetConfig
}

export interface DayScoreResult {
  /** Day score, clamped to +-dayClamp. */
  S: number
  /** Score before clamping. */
  raw: number
  clamped: boolean
  contributions: DayContribution[]
  clean: boolean
  /** Streaks AFTER this day (N/A habits keep their streak). */
  streaks: Record<string, StreakState>
}

/**
 * Share of the habit's streak bonus: 0 before the tier's start day, then equal steps up to full at `streakFullDays`
 * (strong: day 3 = 1/5 … day 7 = full; medium: day 5 = 1/3; weak: full on day 7).
 */
export function streakFraction(pos: number, tier: ImpactTier, cfg: RulesetConfig): number {
  const start = Math.min(cfg.streakStartDay[tier], cfg.streakFullDays)
  const n = Math.min(pos, cfg.streakFullDays)
  if (n < start) return 0
  return (n - start + 1) / (cfg.streakFullDays - start + 1)
}

/** Day score per LIFE_ELO_PRODUCT_CONTEXT.md §6.5: 60 habit base + 20 clean day + 20 streak bonuses. */
export function scoreDay({ habits, zones, streaks, cfg }: DayScoreInput): DayScoreResult {
  const contributions: DayContribution[] = []
  const after: Record<string, StreakState> = {}
  const applicable = habits.filter((h) => (zones[h.id] ?? 'unknown') !== 'not_applicable')
  const sumWeights = applicable.reduce((s, h) => s + cfg.tierWeight[h.tier], 0)

  for (const h of habits) {
    const before = streaks[h.id] ?? EMPTY_STREAK
    const z = zones[h.id] ?? 'unknown'
    if (h.weekly) after[h.id] = { pos: h.weekly.weekStreak, neg: 0 }
    else if (z === 'not_applicable') after[h.id] = before
    else if (z === 'unknown') after[h.id] = breakStreak()
    else after[h.id] = advanceStreak(before, z, cfg)
  }

  let raw = 0
  const push = (c: DayContribution) => {
    contributions.push(c)
    raw += c.points
  }

  if (sumWeights > 0) {
    const unit = cfg.budget.habitBase / sumWeights
    for (const h of applicable) {
      const w = cfg.tierWeight[h.tier]
      const z = zones[h.id] ?? 'unknown'
      const before = streaks[h.id] ?? EMPTY_STREAK
      let share = 0
      let multiplier = 1
      if (z === 'unknown') share = 0
      else if (z === 'bad') {
        share = cfg.zoneShare.bad
        multiplier = negativeMultiplier(after[h.id].neg, cfg)
      } else if (z === 'ok' && isRecovery(before, cfg)) share = cfg.zoneShare.excellent
      else share = cfg.zoneShare[z as Zone]
      push({ source: 'habit', habitId: h.id, zone: z, points: w * unit * share * multiplier, multiplier })
    }
  }

  const checked = applicable.filter((h) => h.canBeBad)
  const clean = checked.length > 0 && checked.every((h) => {
    const z = zones[h.id] ?? 'unknown'
    return z !== 'bad' && z !== 'unknown'
  })
  if (clean) push({ source: 'clean_day', points: cfg.budget.cleanDay, multiplier: 1 })

  if (sumWeights > 0) {
    for (const h of applicable) {
      let fraction: number
      if (h.weekly) {
        if (zones[h.id] !== 'excellent') continue // Bonus is paid on done days only.
        const f = cfg.weeklyStreakFraction[h.tier]
        const week = h.weekly.weekStreak
        fraction = week <= 0 ? 0 : (f[Math.min(week, f.length) - 1] ?? 0)
      } else fraction = streakFraction(after[h.id].pos, h.tier, cfg)
      if (fraction <= 0) continue
      const points = cfg.budget.streak * (cfg.tierWeight[h.tier] / sumWeights) * fraction
      push({ source: 'streak_bonus', habitId: h.id, points, multiplier: 1 })
    }
  }

  const S = Math.max(-cfg.dayClamp, Math.min(cfg.dayClamp, raw))
  return { S, raw, clamped: S !== raw, contributions, clean, streaks: after }
}
