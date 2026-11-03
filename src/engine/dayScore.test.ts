import { describe, expect, it } from 'vitest'
import { RULESET_V1 as cfg } from './config'
import { scoreDay } from './dayScore'
import type { DayHabit, DayZone } from './dayScore'

const strong: DayHabit = { id: 's', tier: 'strong', canBeBad: true }
const medium: DayHabit = { id: 'm', tier: 'medium', canBeBad: true }
const weak: DayHabit = { id: 'w', tier: 'weak', canBeBad: true }
const pts = (r: ReturnType<typeof scoreDay>, src: string, id?: string) =>
  r.contributions.filter((c) => c.source === src && (id === undefined || c.habitId === id)).reduce((s, c) => s + c.points, 0)

function run(habits: DayHabit[], zones: Record<string, DayZone>, streaks = {}) {
  return scoreDay({ habits, zones, streaks, cfg })
}

describe('scoreDay', () => {
  it('single strong habit excellent with streak 7 = 100', () => {
    const r = run([strong], { s: 'excellent' }, { s: { pos: 6, neg: 0 } })
    expect(pts(r, 'habit')).toBeCloseTo(60)
    expect(pts(r, 'clean_day')).toBe(20)
    expect(pts(r, 'streak_bonus')).toBeCloseTo(20)
    expect(r.S).toBeCloseTo(100)
    expect(r.clamped).toBe(false)
  })

  it('two habits, mixed zones (hand computed)', () => {
    // sum=3, unit=20. medium excellent: 40; weak ok (no recovery): 10.
    // clean 20. streaks: medium 1 -> 20*(2/3)/7, weak 1 -> 20*(1/3)/7.
    const r = run([medium, weak], { m: 'excellent', w: 'ok' })
    expect(pts(r, 'habit', 'm')).toBeCloseTo(40)
    expect(pts(r, 'habit', 'w')).toBeCloseTo(10)
    expect(r.S).toBeCloseTo(40 + 10 + 20 + 20 / 7)
  })

  it('bad habit on day 3 of a bad run = -unit*w*1.5', () => {
    const r = run([strong, weak], { s: 'bad', w: 'excellent' }, { s: { pos: 0, neg: 2 } })
    // sum=4, unit=15, strong w=3 -> 45 * 1.5
    expect(pts(r, 'habit', 's')).toBeCloseTo(-67.5)
    expect(r.contributions.find((c) => c.habitId === 's')?.multiplier).toBe(1.5)
    expect(r.clean).toBe(false)
    expect(r.streaks.s).toEqual({ pos: 0, neg: 3 })
  })

  it('bad multipliers by consecutive day: 1, 1.25, 1.5', () => {
    for (const [neg, m] of [[0, 1], [1, 1.25], [2, 1.5], [5, 1.5]]) {
      const r = run([strong], { s: 'bad' }, { s: { pos: 0, neg } })
      expect(pts(r, 'habit')).toBeCloseTo(-60 * m)
    }
  })

  it('ok after two bad days is recovery (full weight); after one bad it is 50%', () => {
    expect(pts(run([strong], { s: 'ok' }, { s: { pos: 0, neg: 2 } }), 'habit')).toBeCloseTo(60)
    expect(pts(run([strong], { s: 'ok' }, { s: { pos: 0, neg: 1 } }), 'habit')).toBeCloseTo(30)
  })

  it('tolerable scores 0, halves streak; bonus uses the halved streak', () => {
    const r = run([strong], { s: 'tolerable' }, { s: { pos: 7, neg: 0 } })
    expect(pts(r, 'habit')).toBe(0)
    expect(pts(r, 'streak_bonus')).toBeCloseTo(20 * 3 / 7)
    expect(r.clean).toBe(true)
  })

  it('unknown destructive blocks clean day', () => {
    const r = run([strong, weak], { s: 'unknown', w: 'excellent' })
    expect(r.clean).toBe(false)
    expect(pts(r, 'clean_day')).toBe(0)
  })

  it('constructive-only day gets no clean-day bonus (Q9)', () => {
    const c: DayHabit = { id: 'c', tier: 'medium', canBeBad: false }
    const r = run([c], { c: 'excellent' })
    expect(r.clean).toBe(false)
    expect(pts(r, 'habit')).toBeCloseTo(60)
  })

  it('constructive habits do not affect the clean day', () => {
    const c: DayHabit = { id: 'c', tier: 'weak', canBeBad: false }
    const r = run([weak, c], { w: 'ok', c: 'unknown' })
    expect(r.clean).toBe(true)
  })

  it('not applicable leaves the sum: remaining habits share 60; streak paused', () => {
    const r = run([medium, weak], { m: 'excellent', w: 'not_applicable' }, { w: { pos: 4, neg: 0 } })
    expect(pts(r, 'habit', 'm')).toBeCloseTo(60)
    expect(r.contributions.some((c) => c.habitId === 'w')).toBe(false)
    expect(r.streaks.w).toEqual({ pos: 4, neg: 0 })
  })

  it('per-habit unknown scores 0, stays in the sum, breaks streak', () => {
    const r = run([medium, weak], { m: 'excellent', w: 'unknown' }, { w: { pos: 4, neg: 0 } })
    expect(pts(r, 'habit', 'm')).toBeCloseTo(40)
    expect(pts(r, 'habit', 'w')).toBe(0)
    expect(r.streaks.w).toEqual({ pos: 0, neg: 0 })
    expect(pts(r, 'streak_bonus', 'w')).toBe(0)
  })

  it('missing zone counts as unknown', () => {
    const r = run([weak], {})
    expect(r.S).toBe(0)
  })

  it('clamps to +-100', () => {
    const cheat = { ...cfg, budget: { habitBase: 90, cleanDay: 30, streak: 30 } }
    const hi = scoreDay({ habits: [strong], zones: { s: 'excellent' }, streaks: { s: { pos: 9, neg: 0 } }, cfg: cheat })
    expect(hi.S).toBe(100)
    expect(hi.clamped).toBe(true)
    expect(hi.raw).toBeGreaterThan(100)
    const lo = scoreDay({
      habits: [strong],
      zones: { s: 'bad' },
      streaks: { s: { pos: 0, neg: 5 } },
      cfg: { ...cfg, budget: { habitBase: 90, cleanDay: 0, streak: 0 } },
    })
    expect(lo.S).toBe(-100)
  })

  it('no habits: S = 0', () => {
    expect(run([], {}).S).toBe(0)
  })
})
