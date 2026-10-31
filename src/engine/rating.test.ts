import { describe, expect, it } from 'vitest'
import { dayOf, reviewDay } from '../domain/day'
import type { DayReview, Habit } from '../domain/types'
import { PLACEHOLDER_RULESET as cfg } from './config'
import { replay } from './rating'

const habit = (id: string, direction: Habit['direction'], tier: Habit['tier']): Habit => ({
  id,
  name: id,
  direction,
  tier,
  rule: { kind: 'boolean' },
  active: true,
  effectiveFrom: '2026-01-01',
  createdAt: 0,
})

const habits = [
  habit('gym', 'constructive', 'medium'),
  habit('shorts', 'destructive', 'strong'),
]

const review = (day: string, outcomes: DayReview['outcomes'], revision = 1): DayReview => ({
  day,
  outcomes,
  confirmedAt: 0,
  revision,
})

describe('replay', () => {
  it('starts at 0 with no reviews', () => {
    expect(replay(habits, [], cfg).rating).toBe(0)
  })

  it('treats constructive not_done as neutral', () => {
    const r = replay(habits, [review('2026-01-01', { gym: 'not_done' })], cfg)
    expect(r.rating).toBe(0)
    expect(r.ledger[0].contributions).toHaveLength(0)
  })

  it('lets the rating go negative on violations', () => {
    const r = replay(habits, [review('2026-01-01', { shorts: 'violated' })], cfg)
    expect(r.rating).toBeLessThan(0)
    expect(r.streaks.shorts).toBe(-1)
  })

  it('does not charge or reset anything for an unreviewed day', () => {
    const r = replay(
      habits,
      [review('2026-01-01', { gym: 'done' }), review('2026-01-03', { gym: 'done' })],
      cfg,
    )
    expect(r.ledger.map((e) => e.day)).toEqual(['2026-01-01', '2026-01-03'])
    expect(r.streaks.gym).toBe(2)
  })

  it('is deterministic: correcting a past day replays without double credit', () => {
    const original = [
      review('2026-01-01', { gym: 'done', shorts: 'violated' }),
      review('2026-01-02', { gym: 'done', shorts: 'complied' }),
    ]
    const corrected = [
      review('2026-01-01', { gym: 'done', shorts: 'complied' }, 2),
      original[1],
    ]
    const fresh = replay(habits, corrected, cfg)
    expect(replay(habits, corrected, cfg)).toEqual(fresh)
    expect(fresh.rating).toBeGreaterThan(replay(habits, original, cfg).rating)
    expect(fresh.cleanDayStreak).toBe(2)
  })

  it('caps the daily delta', () => {
    const many = Array.from({ length: 20 }, (_, i) => habit(`v${i}`, 'destructive', 'strong'))
    const outcomes = Object.fromEntries(many.map((h) => [h.id, 'violated' as const]))
    const r = replay(many, [review('2026-01-01', outcomes)], cfg)
    expect(r.rating).toBe(-cfg.dailyDeltaCap)
    expect(r.ledger[0].capped).toBe(true)
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
