import { describe, expect, it } from 'vitest'
import { addDays } from '../domain/day'
import type { DayReview, Habit, HabitEntry, ImpactTier } from '../domain/types'
import { RULESET_V2 as cfg } from './config'
import { replay } from './rating'
import { finalizeWeek, weeklyGoalProgress, weeklyGoalZone, weeklyTarget } from './weeklyGoal'

// 2026-11-02 is a Monday.
const MON = '2026-11-02'
const yes: HabitEntry = { kind: 'value', value: true }
const no: HabitEntry = { kind: 'value', value: false }

const habit = (tier: ImpactTier, perWeek: number, from = MON): Habit => ({
  id: 'h',
  name: 'h',
  direction: 'constructive',
  versions: [{ from, tier, rule: { kind: 'boolean' }, weeklyGoal: { perWeek } }],
  active: true,
  effectiveFrom: from,
  createdAt: 0,
})

const rev = (day: string, entry: HabitEntry): DayReview => ({ day, entries: { h: entry }, confirmedAt: 0, revision: 1 })

/** One review per day from `from`; `answers` are booleans (true = done) or explicit entries. */
const days = (answers: (boolean | HabitEntry)[], from = MON) =>
  answers.map((a, i) => rev(addDays(from, i), typeof a === 'boolean' ? (a ? yes : no) : a))

const run = (h: Habit, reviews: DayReview[]) => {
  const last = reviews[reviews.length - 1].day
  return replay([h], reviews, cfg, addDays(last, 1))
}
const pts = (e: { contributions: { source: { kind: string }; points: number }[] }, kind: string) =>
  e.contributions.filter((c) => c.source.kind === kind).reduce((s, c) => s + c.points, 0)

describe('weeklyTarget / weeklyGoalZone / finalizeWeek', () => {
  it('pro-rates with ceil(N x activeDays / 7)', () => {
    expect(weeklyTarget(4, 7)).toBe(4)
    expect(weeklyTarget(4, 4)).toBe(3)
    expect(weeklyTarget(7, 1)).toBe(1)
    expect(weeklyTarget(3, 0)).toBe(0)
  })
  it('zone: done excellent; not done N/A while reachable, tolerable after', () => {
    expect(weeklyGoalZone({ done: true, doneBefore: 4, target: 4, remainingAfter: 0 })).toBe('excellent')
    expect(weeklyGoalZone({ done: false, doneBefore: 0, target: 5, remainingAfter: 5 })).toBe('not_applicable')
    expect(weeklyGoalZone({ done: false, doneBefore: 0, target: 5, remainingAfter: 4 })).toBe('tolerable')
    expect(weeklyGoalZone({ done: false, doneBefore: 4, target: 4, remainingAfter: 0 })).toBe('not_applicable')
  })
  it('finalizeWeek: met +1, not met floor(base/2)', () => {
    expect(finalizeWeek(2, true, cfg)).toBe(3)
    expect(finalizeWeek(3, false, cfg)).toBe(1)
    expect(finalizeWeek(1, false, cfg)).toBe(0)
    expect(finalizeWeek(0, false, cfg)).toBe(0)
  })
  it('progress counts distinct done days of the week up to the day', () => {
    expect(weeklyGoalProgress(4, 7, ['2026-11-02', '2026-11-03', '2026-11-03', '2026-10-30'], '2026-11-04')).toEqual({
      done: 2,
      target: 4,
    })
  })
})

describe('worked examples (replay)', () => {
  it('(a) N=4, Mon-Thu done: 4 excellent days, week streak 1 on Thu; Fri-Sun neutral', () => {
    const r = run(habit('strong', 4), days([true, true, true, true, false, false, false]))
    for (let i = 0; i < 4; i++) {
      expect(r.ledger[i].contributions.find((c) => c.source.kind === 'habit')?.zone).toBe('excellent')
    }
    expect(pts(r.ledger[2], 'habit')).toBeCloseTo(60, 10)
    expect(pts(r.ledger[2], 'streak_bonus')).toBe(0) // target not yet met
    expect(pts(r.ledger[3], 'streak_bonus')).toBeCloseTo(20, 10) // met on Thu: week streak 1
    for (let i = 4; i < 7; i++) {
      expect(r.ledger[i].contributions).toEqual([]) // not applicable: nothing scored
      expect(r.ledger[i].delta).toBeLessThanOrEqual(0)
    }
    expect(r.streaks.h.pos).toBe(1)
    expect(r.ledger.every((e) => e.rulesetVersion === 'v2')).toBe(true)
  })

  it('(b) N=5: Mon-Tue missed are neutral, Wed missed is tolerable 0, never negative', () => {
    const r = run(habit('medium', 5), days([false, false, false, false]))
    expect(r.ledger[0].contributions).toEqual([])
    expect(r.ledger[1].contributions).toEqual([])
    expect(r.ledger[2].contributions).toEqual([
      { source: { kind: 'habit', habitId: 'h' }, zone: 'tolerable', points: 0, multiplier: 1 },
    ])
    expect(r.ledger[3].contributions[0].zone).toBe('tolerable')
    for (const e of r.ledger) expect(e.dayScore).toBe(0)
    expect(r.rating).toBe(0)
  })

  it('(c) habit from Thursday with N=4: target 3, three done days meet it', () => {
    const THU = '2026-11-05'
    const r = run(habit('strong', 4, THU), days([true, true, true, false], THU))
    expect(pts(r.ledger[1], 'streak_bonus')).toBe(0)
    expect(pts(r.ledger[2], 'streak_bonus')).toBeCloseTo(20, 10) // Sat: 3 of ceil(4x4/7)=3
    expect(r.streaks.h.pos).toBe(1)
  })

  it('(d) streak by tier: week 1 / week 2 bonus on a done day', () => {
    // Week 1: Mon done (N=1 -> met), rest not done; week 2 Mon done.
    const wk = [true, false, false, false, false, false, false]
    const bonus = (tier: ImpactTier) => {
      const r = run(habit(tier, 1), days([...wk, true]))
      return [pts(r.ledger[0], 'streak_bonus'), pts(r.ledger[7], 'streak_bonus')]
    }
    expect(bonus('strong')).toEqual([20, 20])
    expect(bonus('medium')).toEqual([10, 20])
    expect(bonus('weak')).toEqual([0, 20])
  })

  it('(e) a week below target halves the week streak: 3 -> 1, 1 -> 0', () => {
    const met = [true, false, false, false, false, false, false]
    const missed = [false, false, false, false, false, false, false]
    // 3 met weeks, 1 missed week, then Mon done: base floor(3/2)=1, +1 = 2 (not 4/5).
    const a = run(habit('strong', 1), days([...met, ...met, ...met, ...missed, true]))
    expect(a.streaks.h.pos).toBe(2)
    // 1 met week, 1 missed week, then Mon done: base 0, +1 = 1.
    const b = run(habit('strong', 1), days([...met, ...missed, true]))
    expect(b.streaks.h.pos).toBe(1)
    // The streak itself is untouched during the missed week.
    const c = run(habit('strong', 1), days([...met, ...met, ...met, ...missed]))
    expect(c.streaks.h.pos).toBe(3)
  })

  it('(f) unknown answer and unreviewed day count as not done and do not break the streak', () => {
    const met = days([true, false, false, false, false, false, false])
    // Week 2 (N=1, base 1): Mon unknown, Tue unreviewed (locked -> unknown), Wed done.
    const reviews = [...met, rev('2026-11-09', { kind: 'unknown' }), rev('2026-11-11', yes)]
    const r = run(habit('strong', 1), reviews)
    const at = (d: string) => r.ledger.find((e) => e.day === d)!
    expect(at('2026-11-09').contributions).toEqual([]) // reachable: neutral
    expect(at('2026-11-10').status).toBe('unknown')
    expect(at('2026-11-11').contributions.find((c) => c.source.kind === 'habit')?.zone).toBe('excellent')
    expect(pts(at('2026-11-11'), 'streak_bonus')).toBeCloseTo(20, 10) // week streak 2, strong: full
    expect(r.streaks.h.pos).toBe(2)
  })

  it('(g) done day 5 of 4 is still excellent with full points', () => {
    const r = run(habit('strong', 4), days([true, true, true, true, true]))
    const e = r.ledger[4]
    expect(e.contributions.find((c) => c.source.kind === 'habit')).toMatchObject({ zone: 'excellent', points: 60 })
    expect(pts(e, 'streak_bonus')).toBeCloseTo(20, 10)
  })

  it('П7: per-habit not applicable counts as not done and does not pro-rate the target', () => {
    const na: HabitEntry = { kind: 'not_applicable' }
    // N=7: with Mon N/A the target is still 7 (not ceil(7x6/7)=6), so it is unreachable at once.
    const r = run(habit('strong', 7), days([na]))
    expect(r.ledger[0].contributions[0]).toMatchObject({ zone: 'tolerable', points: 0 })
    // N=3: Mon done, Tue-Sat N/A -> Sat leaves 1 day for 2 needed: tolerable (reachable until Fri).
    const r2 = run(habit('strong', 3), days([true, na, na, na, na, na]))
    expect(r2.ledger[4].contributions).toEqual([])
    expect(r2.ledger[5].contributions[0].zone).toBe('tolerable')
  })

  it('weeks in which the habit was not tracked are skipped: neither counted nor decayed', () => {
    const met = days([true, false, false, false, false, false, false])
    // Weeks 2 and 3 are not reviewed and fall before the lock window only partly; instead pause via a gap:
    // habit inactive after week 1 with no reviews in week 2-3, then reviewed again in week 4.
    const h = { ...habit('strong', 1), active: false }
    const r = run(h, [...met, ...days([true], '2026-11-23')])
    expect(r.streaks.h.pos).toBe(2) // week 1 met (base 1) + week 4 Mon done; weeks 2-3 did not decay it
  })
})
