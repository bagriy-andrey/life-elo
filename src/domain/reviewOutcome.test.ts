import { describe, expect, it } from 'vitest'
import { RULESET_V1 as cfg } from '../engine/config'
import { replay } from '../engine/rating'
import type { DayReview, Habit, HabitEntry } from './types'

import { reviewOutcome } from './reviewOutcome'

const START = '2026-01-01'
const habit = (id: string, direction: Habit['direction']): Habit => ({
  id,
  name: id,
  direction,
  versions: [{ from: START, tier: 'medium', rule: { kind: 'boolean' } }],
  active: true,
  effectiveFrom: START,
  createdAt: 0,
})
const yes: HabitEntry = { kind: 'value', value: true }
// Engine boolean semantics: destructive true = ok (kept clean), false = bad.
const no: HabitEntry = { kind: 'value', value: false }
const rev = (day: string, entries: Record<string, HabitEntry>): DayReview => ({
  day,
  entries,
  confirmedAt: 0,
  revision: 1,
})

const gym = habit('gym', 'constructive')
const sugar = habit('sugar', 'destructive')
const habits = [gym, sugar]
const D1 = '2026-01-01'
const D2 = '2026-01-02'
/** Replays as of 2026-01-03: D2 is the pending day, so an unreviewed D2 does not break streaks. */
const run = (reviews: DayReview[], today = '2026-01-03') => replay(habits, reviews, cfg, today)

const good = { gym: yes, sugar: yes }
const slip = { gym: yes, sugar: no }

describe('reviewOutcome', () => {
  it('positive delta, expected = ratingBefore / eloScale', () => {
    const r1 = rev(D1, good)
    const r2 = rev(D2, good)
    const out = reviewOutcome(run([r1]), run([r1, r2]), D2)
    const e = run([r1, r2]).ledger.find((l) => l.day === D2)!
    expect(out.delta).toBeGreaterThan(0)
    expect(out.delta).toBe(e.delta)
    expect(out.ratingAfter).toBe(e.ratingAfter)
    expect(out.dayScore).toBe(e.dayScore)
    expect(out.expected).toBeCloseTo(e.ratingBefore / cfg.eloScale)
    expect(out.expected).toBeGreaterThan(0)
  })

  it('first day: rating 0 so expected 0', () => {
    const out = reviewOutcome(run([]), run([rev(D1, good)]), D1)
    expect(out.expected).toBe(0)
    expect(out.delta).toBeGreaterThan(0)
  })

  it('streak grew', () => {
    const r1 = rev(D1, good)
    const out = reviewOutcome(run([r1]), run([r1, rev(D2, good)]), D2)
    expect(out.streaksGrew.map((s) => s.habitId).sort()).toEqual(['gym', 'sugar'])
    expect(out.streaksGrew.find((s) => s.habitId === 'gym')!.pos).toBe(2)
    expect(out.streaksBroke).toEqual([])
  })

  it('streak broke', () => {
    const r1 = rev(D1, good)
    const out = reviewOutcome(run([r1]), run([r1, rev(D2, slip)]), D2)
    expect(out.streaksBroke).toEqual([{ habitId: 'sugar', was: 1 }])
    expect(out.streaksGrew.map((s) => s.habitId)).toEqual(['gym'])
  })

  it('bad day while already broken: not "broke", neg-run growth is not "grew"', () => {
    const r1 = rev(D1, slip)
    const out = reviewOutcome(run([r1]), run([r1, rev(D2, slip)]), D2)
    expect(out.streaksBroke).toEqual([])
    expect(out.streaksGrew.map((s) => s.habitId)).toEqual(['gym'])
  })

  it('no change when re-saving an identical review', () => {
    const r1 = rev(D1, good)
    const out = reviewOutcome(run([r1]), run([r1]), D1)
    expect(out.streaksGrew).toEqual([])
    expect(out.streaksBroke).toEqual([])
  })

  it('R <= 0 stays frozen on a bad day', () => {
    const bad = { gym: no, sugar: no }
    const r1 = rev(D1, bad)
    const r2 = rev(D2, bad)
    const out = reviewOutcome(run([r1]), run([r1, r2]), D2)
    const e = run([r1, r2]).ledger.find((l) => l.day === D2)!
    expect(e.ratingBefore).toBeLessThanOrEqual(0)
    expect(out.ratingAfter).toBe(e.ratingAfter)
    expect(out.expected).toBe(e.ratingBefore / cfg.eloScale)
  })
})
