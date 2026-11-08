import { addDays, eachDay } from '../domain/day'
import { settingsOn } from '../domain/settings'
import type { DayKey, DayReview, Habit, HabitEntry } from '../domain/types'
import type { RulesetConfig } from './config'
import { scoreDay } from './dayScore'
import type { DayHabit, DayZone } from './dayScore'
import { quotaZone } from './quota'
import { breakStreak } from './streaks'
import type { StreakState } from './streaks'
import { classifyZone } from './zones'

/** Why the rating moved: one line per contributing habit or bonus. */
export interface Contribution {
  source:
    | { kind: 'habit'; habitId: string }
    | { kind: 'clean_day' }
    | { kind: 'streak_bonus'; habitId: string }
    | { kind: 'unknown_day' }
  zone?: DayZone
  points: number
  multiplier: number
}

export interface LedgerEntry {
  day: DayKey
  rulesetVersion: string
  /** 0 for an unknown (never reviewed) day. */
  reviewRevision: number
  status: 'reviewed' | 'unknown'
  ratingBefore: number
  delta: number
  ratingAfter: number
  /** Day score S (0 for an unknown day). */
  dayScore: number
  /** The usual day: ratingBefore / eloScale. */
  expected: number
  /** True when the raw day score exceeded the clamp. */
  clamped: boolean
  contributions: Contribution[]
}

export interface ReplayResult {
  rating: number
  ledger: LedgerEntry[]
  /** Streaks per habit after the last processed day. */
  streaks: Record<string, StreakState>
  /** Consecutive clean days ending at the last processed day. */
  cleanDayStreak: number
}

type DayEntries = Record<string, HabitEntry | undefined>

/**
 * Deterministically rebuilds the whole rating history from confirmed reviews
 * (LIFE_ELO_PRODUCT_CONTEXT.md §6.5). Pure: the same inputs always produce the
 * same ledger, so correcting a past day is just "save the review, replay".
 * `today` is a calendar day key (`dayOf(now)`); it decides which
 * unreviewed days are already locked (unknown) and which are still pending.
 */
export function replay(
  habits: Habit[],
  reviews: DayReview[],
  cfg: RulesetConfig,
  today: DayKey,
): ReplayResult {
  const byDay = new Map(reviews.map((r) => [r.day, r]))
  const entriesByDay: Record<DayKey, DayEntries> = {}
  for (const r of reviews) entriesByDay[r.day] = r.entries

  let rating = 0 // Confirmed: R0 = 0.
  let streaks: Record<string, StreakState> = {}
  let cleanDayStreak = 0
  const ledger: LedgerEntry[] = []
  if (habits.length === 0) return { rating, ledger, streaks, cleanDayStreak }

  const first = habits.reduce((min, h) => (h.effectiveFrom < min ? h.effectiveFrom : min), habits[0].effectiveFrom)
  const lastLocked = addDays(today, -1 - cfg.reviewWindowDays)
  const lastReviewed = reviews.reduce((max, r) => (r.day > max ? r.day : max), first)
  const last = lastReviewed > lastLocked ? lastReviewed : lastLocked

  for (const day of eachDay(first, last)) {
    const review = byDay.get(day)
    const entries = entriesByDay[day] ?? {}
    const tracked = habits.filter(
      (h) => h.effectiveFrom <= day && (review ? h.active || h.id in entries : h.active),
    )
    if (tracked.length === 0) continue

    if (!review) {
      if (day > lastLocked) continue // Still pending: neither reviewed nor unknown yet.
      const ratingBefore = rating
      if (rating > 0) rating += cfg.eloRate * (0 - rating) // S = 0 only when R > 0.
      streaks = { ...streaks, ...Object.fromEntries(tracked.map((h) => [h.id, breakStreak()])) }
      cleanDayStreak = 0
      ledger.push({
        day,
        rulesetVersion: cfg.version,
        reviewRevision: 0,
        status: 'unknown',
        ratingBefore,
        delta: rating - ratingBefore,
        ratingAfter: rating,
        dayScore: 0,
        expected: ratingBefore / cfg.eloScale,
        clamped: false,
        contributions: [{ source: { kind: 'unknown_day' }, points: 0, multiplier: 1 }],
      })
      continue
    }

    const dayHabits: DayHabit[] = []
    const zones: Record<string, DayZone> = {}
    for (const h of tracked) {
      const s = settingsOn(h, day)
      dayHabits.push({
        id: h.id,
        tier: s.tier,
        // §6.5: only destructive or quota habits can be bad; constructive habits never join the clean day.
        canBeBad: h.direction === 'destructive' || s.quota !== undefined,
      })
      const entry = entries[h.id]
      if (!entry || entry.kind === 'unknown') zones[h.id] = 'unknown'
      else if (entry.kind === 'not_applicable') zones[h.id] = 'not_applicable'
      else {
        const habitFor = { id: h.id, direction: h.direction, rule: s.rule, quota: s.quota }
        const zone = s.quota ? quotaZone(habitFor, day, entriesByDay) : classifyZone(habitFor, entry)
        zones[h.id] = zone ?? 'unknown' // Mistyped value: no zone, treated as unknown.
      }
    }

    const result = scoreDay({ habits: dayHabits, zones, streaks, cfg })
    streaks = { ...streaks, ...result.streaks }
    cleanDayStreak = result.clean ? cleanDayStreak + 1 : 0

    const ratingBefore = rating
    rating += cfg.eloRate * (cfg.eloScale * result.S - rating)
    ledger.push({
      day,
      rulesetVersion: cfg.version,
      reviewRevision: review.revision,
      status: 'reviewed',
      ratingBefore,
      delta: rating - ratingBefore,
      ratingAfter: rating,
      dayScore: result.S,
      expected: ratingBefore / cfg.eloScale,
      clamped: result.clamped,
      contributions: result.contributions.map((c) => ({
        source:
          c.source === 'clean_day'
            ? { kind: 'clean_day' }
            : { kind: c.source, habitId: c.habitId! },
        zone: c.zone,
        points: c.points,
        multiplier: c.multiplier,
      })),
    })
  }

  return { rating, ledger, streaks, cleanDayStreak }
}
