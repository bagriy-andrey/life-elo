import { describe, expect, it } from 'vitest'
import { buildReview, DayLockedError } from './confirm'
import { migrateHabit, migrateReview } from './migrate'
import type { DayReview, Habit } from '../domain/types'

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'h',
  name: 'H',
  direction: 'constructive',
  tier: 'medium',
  rule: { kind: 'boolean' },
  active: true,
  effectiveFrom: '2026-01-05',
  createdAt: 0,
  ...over,
})

describe('migrateReview', () => {
  it('rewrites outcomes into entries and drops outcomes', () => {
    const r: DayReview = {
      day: '2026-01-06',
      outcomes: { a: 'done', b: 'violated', c: 'not_applicable', d: 'unknown' },
      confirmedAt: 5,
      revision: 2,
    }
    const m = migrateReview(r)
    expect(m).toEqual({
      day: '2026-01-06',
      entries: {
        a: { kind: 'value', value: true },
        b: { kind: 'value', value: false },
        c: { kind: 'not_applicable' },
        d: { kind: 'unknown' },
      },
      confirmedAt: 5,
      revision: 2,
    })
    expect('outcomes' in m).toBe(false)
  })

  it('is idempotent on already migrated reviews', () => {
    const once = migrateReview({ day: 'x', outcomes: { a: 'done' }, confirmedAt: 1, revision: 1 })
    expect(migrateReview(once)).toEqual(once)
  })
})

describe('migrateHabit', () => {
  it('builds versions[0] from effectiveFrom with normalized rule', () => {
    const m = migrateHabit(habit({ rule: { kind: 'count', limit: 3 }, tier: 'strong' }))
    expect(m.versions).toEqual([{ from: '2026-01-05', tier: 'strong', rule: { kind: 'boolean' } }])
  })

  it('carries an existing quota', () => {
    const quota = { perWeek: 2 }
    expect(migrateHabit(habit({ quota })).versions?.[0].quota).toEqual(quota)
  })

  it('keeps existing versions untouched', () => {
    const h = habit({
      versions: [{ from: '2026-01-05', tier: 'weak', rule: { kind: 'boolean' } }],
    })
    expect(migrateHabit(h)).toBe(h)
  })
})

describe('buildReview (lock guard)', () => {
  const entries = { a: { kind: 'value' as const, value: true } }

  it('allows yesterday and the day before when now is D+1 / D+2 before 04:00', () => {
    expect(buildReview('2026-03-10', entries, new Date(2026, 2, 11, 12)).revision).toBe(1)
    expect(buildReview('2026-03-10', entries, new Date(2026, 2, 12, 3, 59)).revision).toBe(1)
  })

  it('rejects a day from D+2 04:00 on', () => {
    expect(() => buildReview('2026-03-10', entries, new Date(2026, 2, 12, 4, 0))).toThrow(
      DayLockedError,
    )
  })

  it('bumps revision on correction and stamps confirmedAt', () => {
    const now = new Date(2026, 2, 11, 9)
    const r = buildReview('2026-03-10', entries, now, { revision: 2 })
    expect(r).toEqual({ day: '2026-03-10', entries, confirmedAt: now.getTime(), revision: 3 })
  })
})
