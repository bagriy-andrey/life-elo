import { describe, expect, it } from 'vitest'
import { settingsOn } from './settings'
import type { Habit } from './types'

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'h',
  name: 'h',
  direction: 'constructive',
  versions: [{ from: '2026-01-01', tier: 'weak', rule: { kind: 'boolean' } }],
  active: true,
  effectiveFrom: '2026-01-01',
  createdAt: 0,
  ...over,
})

describe('settingsOn', () => {
  it('returns the only version for any day', () => {
    const h = habit({
      versions: [{ from: '2026-01-01', tier: 'strong', rule: { kind: 'boolean' }, quota: { perDay: 1 } }],
    })
    expect(settingsOn(h, '2026-02-01')).toEqual(h.versions[0])
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

  it('reads a stored «lower» on constructive count/minutes/steps as «higher»', () => {
    const minutes = { kind: 'measured', unit: 'minutes', better: 'lower', excellent: 60 } as const
    const h = habit({ versions: [{ from: '2026-01-01', tier: 'strong', rule: minutes }] })
    expect(settingsOn(h, '2026-02-01').rule).toEqual({ ...minutes, better: 'higher' })
    expect(h.versions[0].rule).toBe(minutes)
  })

  it('keeps «lower» for constructive time and destructive rules', () => {
    const time = { kind: 'measured', unit: 'time', better: 'lower', excellent: '23:00' } as const
    const count = { kind: 'measured', unit: 'count', better: 'lower', excellent: 0 } as const
    expect(settingsOn(habit({ versions: [{ from: '2026-01-01', tier: 'weak', rule: time }] }), '2026-02-01').rule).toBe(time)
    const destructive = habit({ direction: 'destructive', versions: [{ from: '2026-01-01', tier: 'weak', rule: count }] })
    expect(settingsOn(destructive, '2026-02-01').rule).toBe(count)
  })
})
