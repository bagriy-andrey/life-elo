import { describe, expect, it } from 'vitest'
import { addDays, dayOf, reviewDay } from '../domain/day'
import type { DayReview, Habit, HabitEntry } from '../domain/types'
import { RULESET_V1 as cfg } from './config'
import { replay } from './rating'

const START = '2026-01-01'

const habit = (id: string, direction: Habit['direction'], tier: Habit['tier'], extra: Partial<Habit> = {}): Habit => ({
  id,
  name: id,
  direction,
  tier,
  rule: { kind: 'boolean' },
  active: true,
  effectiveFrom: START,
  createdAt: 0,
  ...extra,
})

const yes: HabitEntry = { kind: 'value', value: true }
const no: HabitEntry = { kind: 'value', value: false }
const num = (value: number): HabitEntry => ({ kind: 'value', value })

const review = (day: string, entries: Record<string, HabitEntry>, revision = 1): DayReview => ({
  day,
  entries,
  confirmedAt: 0,
  revision,
})

const gym = habit('gym', 'constructive', 'medium')
// Destructive measured count: 0 = excellent, 1 = ok, 2 = tolerable, more = bad.
const sugar = habit('sugar', 'destructive', 'strong', {
  versions: [
    {
      from: START,
      tier: 'strong',
      rule: { kind: 'measured', unit: 'count', better: 'lower', excellent: 0, ok: 1, tolerable: 2 },
    },
  ],
})

const perfectDays = (n: number, from = START) =>
  Array.from({ length: n }, (_, i) => review(addDays(from, i), { sugar: num(0) }))

/** Replays as of the day after the last review (so that last day is still pending, not locked). */
const rp = (habits: Habit[], reviews: DayReview[], today?: string) => {
  const last = reviews.reduce((max, r) => (r.day > max ? r.day : max), START)
  return replay(habits, reviews, cfg, today ?? addDays(last, 1))
}

describe('replay', () => {
  it('starts at 0 with no reviews or habits', () => {
    expect(rp([gym], []).rating).toBe(0)
    expect(rp([], [])).toMatchObject({ rating: 0, ledger: [] })
  })

  it('first perfect day moves R to S (R += 0.1 x (10S - 0))', () => {
    const r = rp([sugar], perfectDays(1))
    const e = r.ledger[0]
    // 60 base + 20 clean day + 20 x 1/7 streak bonus
    expect(e.dayScore).toBeCloseTo(60 + 20 + 20 / 7, 10)
    expect(r.rating).toBeCloseTo(e.dayScore, 10)
    expect(e.status).toBe('reviewed')
  })

  it('reaches S = 100 on day 7 of a perfect streak', () => {
    const r = rp([sugar], perfectDays(7))
    expect(r.ledger[6].dayScore).toBeCloseTo(100, 10)
    expect(r.cleanDayStreak).toBe(7)
    expect(r.streaks.sugar.pos).toBe(7)
  })

  it('moves R half-way toward 10S over time (R += 0.1 x (10S - R))', () => {
    const r = rp([sugar], perfectDays(7))
    let expected = 0
    for (const e of r.ledger) expected += 0.1 * (10 * e.dayScore - expected)
    expect(r.rating).toBeCloseTo(expected, 8)
    expect(r.ledger[6].ratingBefore).toBeCloseTo(r.ledger[5].ratingAfter, 10)
  })

  it('treats constructive not_done as tolerable: no points, no clean day', () => {
    const r = rp([gym], [review(START, { gym: no })])
    expect(r.ledger[0].dayScore).toBe(0)
    expect(r.ledger[0].contributions.map((c) => c.source.kind)).toEqual(['habit'])
    expect(r.rating).toBe(0)
  })

  it('constructive habits never produce a clean day', () => {
    const r = rp([gym], [review(START, { gym: yes })])
    expect(r.ledger[0].contributions.some((c) => c.source.kind === 'clean_day')).toBe(false)
    expect(r.cleanDayStreak).toBe(0)
  })

  it('lets the rating go negative on a bad day', () => {
    const r = rp([sugar], [review(START, { sugar: num(5) })])
    expect(r.rating).toBeLessThan(0)
    expect(r.streaks.sugar.neg).toBe(1)
  })

  it('a positive day below the usual day lowers R', () => {
    const lowTier = habit('walk', 'constructive', 'weak')
    const habits = [sugar, lowTier]
    const warmup = perfectDays(14).map((r) => review(r.day, { sugar: num(0), walk: yes }))
    const dip = review(addDays(START, 14), { sugar: num(2), walk: yes })
    const r = rp(habits, [...warmup, dip])
    const last = r.ledger.at(-1)!
    expect(last.dayScore).toBeGreaterThan(0)
    expect(last.dayScore).toBeLessThan(last.expected)
    expect(last.delta).toBeLessThan(0)
  })

  it('ledger expected = ratingBefore / 10', () => {
    const r = rp([sugar], perfectDays(3))
    for (const e of r.ledger) expect(e.expected).toBeCloseTo(e.ratingBefore / 10, 12)
  })

  it('third consecutive all-bad day scores -90 (x1.5), inside the clamp', () => {
    const many = Array.from({ length: 10 }, (_, i) => habit(`v${i}`, 'destructive', 'strong'))
    const entries = Object.fromEntries(many.map((h) => [h.id, no]))
    const days = [0, 1, 2].map((i) => review(addDays(START, i), entries))
    const r = rp(many, days)
    expect(r.ledger[2].dayScore).toBeCloseTo(-90, 10)
    expect(r.ledger[2].clamped).toBe(false)
  })
})

describe('unknown days', () => {
  it('decays a positive R by 0.9x on a locked unreviewed day', () => {
    const r = rp([sugar], [...perfectDays(1)], addDays(START, 3))
    // Day 2 (Jan 2) is locked on Jan 4; day 1 was reviewed.
    const [d1, d2] = r.ledger
    expect(d2.day).toBe('2026-01-02')
    expect(d2.status).toBe('unknown')
    expect(d2.dayScore).toBe(0)
    expect(d2.ratingAfter).toBeCloseTo(d1.ratingAfter * 0.9, 10)
  })

  it('leaves R <= 0 untouched', () => {
    const r = rp([sugar], [review(START, { sugar: num(5) })], addDays(START, 4))
    const [bad, unk] = r.ledger
    expect(bad.ratingAfter).toBeLessThan(0)
    expect(unk.status).toBe('unknown')
    expect(unk.ratingAfter).toBe(bad.ratingAfter)
    expect(unk.delta).toBe(0)
  })

  it('a skipped day can never raise R', () => {
    for (const first of [num(0), num(5)]) {
      const r = rp([sugar], [review(START, { sugar: first })], addDays(START, 4))
      for (const e of r.ledger.filter((x) => x.status === 'unknown')) expect(e.delta).toBeLessThanOrEqual(0)
    }
  })

  it('breaks streaks and the clean-day run', () => {
    const r = rp(
      [gym, sugar],
      [review(START, { gym: yes, sugar: num(0) }), review('2026-01-03', { gym: yes, sugar: num(0) })],
    )
    expect(r.ledger.map((e) => e.status)).toContain('unknown')
    expect(r.streaks.gym.pos).toBe(1)
    expect(r.streaks.sugar.pos).toBe(1)
  })

  it('does not treat a pending (unlocked) yesterday as unknown', () => {
    const today = '2026-01-03' // Jan 2 is yesterday: still reviewable.
    const r = rp([gym], [review(START, { gym: yes })], today)
    expect(r.ledger.map((e) => e.day)).toEqual([START])
  })

  it('a never-reviewed day becomes unknown once locked', () => {
    const r = rp([gym], [review(START, { gym: yes })], '2026-01-04')
    expect(r.ledger.map((e) => [e.day, e.status])).toEqual([
      [START, 'reviewed'],
      ['2026-01-02', 'unknown'],
    ])
  })

  it('a per-habit unknown inside a reviewed day scores 0 and blocks the clean day', () => {
    const r = rp([sugar], [review(START, { sugar: { kind: 'unknown' } })])
    expect(r.ledger[0].dayScore).toBe(0)
    expect(r.cleanDayStreak).toBe(0)
  })

  it('skips days before any habit is tracked', () => {
    const late = habit('late', 'constructive', 'weak', { effectiveFrom: '2026-02-01' })
    const r = rp([late], [], '2026-02-10')
    expect(r.ledger[0].day).toBe('2026-02-01')
    expect(r.ledger.every((e) => e.day >= '2026-02-01')).toBe(true)
  })
})

describe('corrections and versions', () => {
  it('is deterministic: correcting a past day replays without double credit', () => {
    const original = [
      review(START, { gym: yes, sugar: num(5) }),
      review('2026-01-02', { gym: yes, sugar: num(0) }),
    ]
    const corrected = [review(START, { gym: yes, sugar: num(0) }, 2), original[1]]
    const habits = [gym, sugar]
    const fresh = rp(habits, corrected)
    expect(rp(habits, [...corrected].reverse())).toEqual(fresh)
    expect(fresh.rating).toBeGreaterThan(rp(habits, original).rating)
    expect(fresh.cleanDayStreak).toBe(2)
    expect(fresh.ledger[0].reviewRevision).toBe(2)
  })

  it('a change of thresholds from day D leaves earlier days unchanged', () => {
    const rule = (excellent: number) =>
      ({ kind: 'measured', unit: 'steps', better: 'higher', excellent, ok: 8000, tolerable: 5000 }) as const
    const v1 = { from: START, tier: 'medium' as const, rule: rule(10000) }
    const base = habit('steps', 'constructive', 'medium')
    const days = [0, 1, 2].map((i) => review(addDays(START, i), { steps: num(11000) }))
    const old = rp([{ ...base, versions: [v1] }], days)
    const changed = rp(
      [{ ...base, versions: [v1, { from: '2026-01-03', tier: 'medium', rule: rule(12000) }] }],
      days,
    )
    expect(changed.ledger.slice(0, 2)).toEqual(old.ledger.slice(0, 2))
    expect(old.ledger[2].contributions[0].zone).toBe('excellent')
    expect(changed.ledger[2].contributions[0].zone).toBe('ok')
  })
})

describe('quota and entries', () => {
  // 2026-01-05 is a Monday.
  const quotaHabit = habit('mb', 'destructive', 'medium', { quota: { perDay: 1, perWeek: 2 } })
  const zoneOn = (r: ReturnType<typeof replay>, i: number) => r.ledger[i].contributions[0].zone

  it('applies the weekly quota cumulatively: Mon 1 ok, Tue 1 ok, Wed 1 bad', () => {
    const days = ['2026-01-05', '2026-01-06', '2026-01-07'].map((d) => review(d, { mb: num(1) }))
    const r = rp([{ ...quotaHabit, effectiveFrom: '2026-01-05' }], days)
    expect([0, 1, 2].map((i) => zoneOn(r, i))).toEqual(['ok', 'ok', 'bad'])
  })

  it('zero count is bad while the weekly total already exceeds the limit', () => {
    const days = ['2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08'].map((d, i) =>
      review(d, { mb: num(i < 3 ? 1 : 0) }),
    )
    const r = rp([{ ...quotaHabit, effectiveFrom: '2026-01-05' }], days)
    expect(zoneOn(r, 3)).toBe('bad')
  })

  it('a quota habit can be bad even when constructive', () => {
    const h = habit('q', 'constructive', 'weak', { quota: { perDay: 1 }, effectiveFrom: '2026-01-05' })
    const good = rp([h], [review('2026-01-05', { q: num(1) })])
    expect(good.cleanDayStreak).toBe(1)
    const bad = rp([h], [review('2026-01-05', { q: num(3) })])
    expect(bad.cleanDayStreak).toBe(0)
  })

  it('a mistyped value is treated as unknown; N/A leaves the weight sum', () => {
    const r = rp(
      [gym, sugar],
      [review(START, { gym: { kind: 'value', value: 'x' }, sugar: { kind: 'not_applicable' } })],
    )
    expect(r.ledger[0].contributions[0].zone).toBe('unknown')
    expect(r.ledger[0].contributions.find((c) => c.source.kind === 'habit' && c.zone === 'not_applicable'))
      .toBeUndefined()
  })

  it('reads legacy outcomes through entriesOf', () => {
    const legacy: DayReview = { day: START, outcomes: { gym: 'done' }, confirmedAt: 0, revision: 1 }
    const r = rp([gym], [legacy])
    expect(r.ledger[0].contributions[0].zone).toBe('excellent')
  })
})

describe('day boundary', () => {
  it('assigns a 00:30 bedtime to the previous evening', () => {
    expect(dayOf(new Date(2026, 0, 2, 0, 30))).toBe('2026-01-01')
  })

  it('reviews yesterday in the morning', () => {
    expect(reviewDay(new Date(2026, 0, 2, 8, 0))).toBe('2026-01-01')
  })
})
