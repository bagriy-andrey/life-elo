import type { ReplayResult } from '../engine/rating'
import type { DayKey } from './types'

export interface ReviewOutcome {
  /** Signed Elo change of the saved day. */
  delta: number
  ratingAfter: number
  /** Day score S of the saved day. */
  dayScore: number
  /** The usual day: ratingBefore / eloScale. */
  expected: number
  streaksGrew: { habitId: string; pos: number }[]
  streaksBroke: { habitId: string; was: number }[]
}

/**
 * What the done screen shows after saving `day`: the day's own ledger entry from
 * the replay that includes the saved review, plus streak changes between the two
 * replays. Neg-run growth is not "grew". Pure; nothing is stored.
 */
export function reviewOutcome(before: ReplayResult, after: ReplayResult, day: DayKey): ReviewOutcome {
  const entry = after.ledger.find((e) => e.day === day)
  const streaksGrew: ReviewOutcome['streaksGrew'] = []
  const streaksBroke: ReviewOutcome['streaksBroke'] = []
  for (const [habitId, s] of Object.entries(after.streaks)) {
    const was = before.streaks[habitId]?.pos ?? 0
    if (s.pos > was) streaksGrew.push({ habitId, pos: s.pos })
    else if (was > 0 && s.pos === 0) streaksBroke.push({ habitId, was })
  }
  return {
    delta: entry?.delta ?? 0,
    ratingAfter: entry?.ratingAfter ?? after.rating,
    dayScore: entry?.dayScore ?? 0,
    expected: entry?.expected ?? 0,
    streaksGrew,
    streaksBroke,
  }
}
