import { describe, expect, it } from 'vitest'
import { entriesOf, normalizeRule, settingsOn } from './legacy'
import type { DayReview, Habit, HabitOutcome } from './types'

const review = (outcomes: Record<string, HabitOutcome>): DayReview => ({
  day: '2026-01-01',
  outcomes,
  confirmedAt: 0,
  revision: 0,
})

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'h',
  name: 'h',
  direction: 'constructive',
  tier: 'weak',
  rule: { kind: 'boolean' },
  active: true,
  effectiveFrom: '2026-01-01',
  createdAt: 0,
  ...over,
})

describe('entriesOf', () => {
  it('maps every legacy outcome', () => {
    expect(
      entriesOf(
        review({
          a: 'done',
          b: 'not_done',
          c: 'complied',
          d: 'violated',
          e: 'not_applicable',
          f: 'unknown',
        }),
      ),
    ).toEqual({
      a: { kind: 'value', value: true },
      b: { kind: 'value', value: false },
      c: { kind: 'value', value: true },
      d: { kind: 'value', value: false },
      e: { kind: 'not_applicable' },
      f: { kind: 'unknown' },
    })
  })

  it('prefers entries over outcomes', () => {
    const r = { ...review({ a: 'done' }), entries: { a: { kind: 'unknown' as const } } }
    expect(entriesOf(r)).toEqual({ a: { kind: 'unknown' } })
  })

  it('handles a review with neither', () => {
    expect(entriesOf({ day: 'x', confirmedAt: 0, revision: 0 })).toEqual({})
  })
})

describe('normalizeRule', () => {
  it('turns legacy rules into boolean', () => {
    expect(normalizeRule({ kind: 'count', limit: 2 })).toEqual({ kind: 'boolean' })
    expect(normalizeRule({ kind: 'minutes', limit: 2 })).toEqual({ kind: 'boolean' })
    expect(normalizeRule({ kind: 'time', notAfter: '23:00' })).toEqual({ kind: 'boolean' })
    expect(normalizeRule({ kind: 'boolean' })).toEqual({ kind: 'boolean' })
  })

  it('keeps measured rules', () => {
    const r = { kind: 'measured', unit: 'steps', better: 'higher', excellent: 10000, tolerable: 5000 } as const
    expect(normalizeRule(r)).toBe(r)
  })
})

describe('settingsOn', () => {
  it('falls back to top-level tier/rule/quota while legacy', () => {
    const h = habit({ tier: 'strong', quota: { perDay: 1 } })
    expect(settingsOn(h, '2026-02-01')).toEqual({
      from: '2026-01-01',
      tier: 'strong',
      rule: { kind: 'boolean' },
      quota: { perDay: 1 },
    })
  })

  it('picks the version in effect on edge days', () => {
    const h = habit({
      versions: [
        { from: '2026-01-01', tier: 'weak', rule: { kind: 'boolean' } },
        { from: '2026-01-10', tier: 'strong', rule: { kind: 'boolean' } },
      ],
    })
    expect(settingsOn(h, '2025-12-31').tier).toBe('weak')
    expect(settingsOn(h, '2026-01-01').tier).toBe('weak')
    expect(settingsOn(h, '2026-01-09').tier).toBe('weak')
    expect(settingsOn(h, '2026-01-10').tier).toBe('strong')
    expect(settingsOn(h, '2026-03-01').tier).toBe('strong')
  })
})
