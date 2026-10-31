import { addDays } from '../domain/day'
import type { DayKey, DayReview, Habit, HabitOutcome } from '../domain/types'
import type { RulesetConfig } from './config'

/** Why the rating moved: one line per contributing habit or bonus. */
export interface Contribution {
  source: { kind: 'habit'; habitId: string } | { kind: 'clean_day' }
  outcome?: HabitOutcome
  base: number
  streak: number
  multiplier: number
  points: number
}

export interface LedgerEntry {
  day: DayKey
  rulesetVersion: string
  reviewRevision: number
  ratingBefore: number
  delta: number
  ratingAfter: number
  contributions: Contribution[]
  /** True when |raw delta| exceeded the daily cap. */
  capped: boolean
}

/** Signed streak per habit: >0 consecutive good days, <0 consecutive violations. */
export type StreakState = Record<string, number>

export interface ReplayResult {
  rating: number
  ledger: LedgerEntry[]
  streaks: StreakState
  cleanDayStreak: number
}

/** Sign of an outcome for streak purposes; 0 = neutral (does not touch streak). */
function outcomeSign(outcome: HabitOutcome): -1 | 0 | 1 {
  switch (outcome) {
    case 'done':
    case 'complied':
      return 1
    case 'violated':
      return -1
    default:
      return 0
  }
}

function nextStreak(prev: number, sign: -1 | 0 | 1): number {
  if (sign === 0) return prev
  if (sign > 0) return prev > 0 ? prev + 1 : 1
  return prev < 0 ? prev - 1 : -1
}

function multiplierFor(streak: number, cfg: RulesetConfig): number {
  const extra = (Math.abs(streak) - 1) * cfg.streakStep
  return Math.min(1 + Math.max(0, extra), cfg.streakMaxMultiplier)
}

const round = (n: number) => Math.round(n * 100) / 100

/**
 * Deterministically rebuilds the whole rating history from confirmed reviews.
 * Pure: the same inputs always produce the same ledger, so correcting a past
 * day is just "save the review, replay" — no duplicate rewards.
 */
export function replay(
  habits: Habit[],
  reviews: DayReview[],
  cfg: RulesetConfig,
): ReplayResult {
  const byId = new Map(habits.map((h) => [h.id, h]))
  const sorted = [...reviews].sort((a, b) => a.day.localeCompare(b.day))

  let rating = 0 // Confirmed: R0 = 0.
  let streaks: StreakState = {}
  let cleanDayStreak = 0
  let prevDay: DayKey | undefined
  const ledger: LedgerEntry[] = []

  for (const review of sorted) {
    if (cfg.gapBreaksStreak && prevDay && addDays(prevDay, 1) !== review.day) {
      streaks = {}
      cleanDayStreak = 0
    }
    prevDay = review.day

    const contributions: Contribution[] = []
    let destructiveApplicable = 0
    let destructiveComplied = 0

    for (const [habitId, outcome] of Object.entries(review.outcomes)) {
      const habit = byId.get(habitId)
      if (!habit || habit.effectiveFrom > review.day) continue

      const sign = outcomeSign(outcome)
      const streak = nextStreak(streaks[habitId] ?? 0, sign)
      streaks[habitId] = streak

      if (habit.direction === 'destructive' && (outcome === 'complied' || outcome === 'violated')) {
        destructiveApplicable++
        if (outcome === 'complied') destructiveComplied++
      }

      // Constructive not_done, not_applicable and unknown are neutral.
      if (sign === 0) continue

      const weight = cfg.tierWeight[habit.tier]
      const base =
        outcome === 'complied' ? weight * cfg.compliedFactor : sign * weight
      const multiplier = multiplierFor(streak, cfg)
      contributions.push({
        source: { kind: 'habit', habitId },
        outcome,
        base,
        streak,
        multiplier,
        points: round(base * multiplier),
      })
    }

    const isCleanDay =
      destructiveApplicable > 0 && destructiveComplied === destructiveApplicable
    cleanDayStreak = isCleanDay ? cleanDayStreak + 1 : 0
    if (isCleanDay) {
      const multiplier = multiplierFor(cleanDayStreak, cfg)
      contributions.push({
        source: { kind: 'clean_day' },
        base: cfg.cleanDayBonus,
        streak: cleanDayStreak,
        multiplier,
        points: round(cfg.cleanDayBonus * multiplier),
      })
    }

    const raw = contributions.reduce((sum, c) => sum + c.points, 0)
    const delta = round(
      Math.max(-cfg.dailyDeltaCap, Math.min(cfg.dailyDeltaCap, raw)),
    )
    ledger.push({
      day: review.day,
      rulesetVersion: cfg.version,
      reviewRevision: review.revision,
      ratingBefore: rating,
      delta,
      ratingAfter: round(rating + delta),
      contributions,
      capped: delta !== round(raw),
    })
    rating = round(rating + delta)
  }

  return { rating, ledger, streaks, cleanDayStreak }
}
