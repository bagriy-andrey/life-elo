import { describe, expect, it } from 'vitest'
import type { HabitEntry, ZonedRule } from '../domain/types'
import { classifyZone } from './zones'

const v = (value: boolean | number | string): HabitEntry => ({ kind: 'value', value })

const bedtime: ZonedRule = { kind: 'measured', unit: 'time', better: 'lower', excellent: '23:00', tolerable: '01:00' }
const steps: ZonedRule = { kind: 'measured', unit: 'steps', better: 'higher', excellent: 10000, tolerable: 5000 }
const social: ZonedRule = { kind: 'measured', unit: 'minutes', better: 'lower', excellent: 0, ok: 20 }
const bool: ZonedRule = { kind: 'boolean' }

describe('classifyZone boolean', () => {
  it('constructive: done excellent, not done tolerable', () => {
    expect(classifyZone({ direction: 'constructive', rule: bool }, v(true))).toBe('excellent')
    expect(classifyZone({ direction: 'constructive', rule: bool }, v(false))).toBe('tolerable')
  })
  it('destructive: complied ok, violated bad', () => {
    expect(classifyZone({ direction: 'destructive', rule: bool }, v(true))).toBe('ok')
    expect(classifyZone({ direction: 'destructive', rule: bool }, v(false))).toBe('bad')
  })
})

describe('classifyZone measured', () => {
  const h = (rule: ZonedRule) => ({ direction: 'constructive' as const, rule })
  it('bedtime', () => {
    expect(classifyZone(h(bedtime), v('22:59'))).toBe('excellent')
    expect(classifyZone(h(bedtime), v('23:00'))).toBe('excellent')
    expect(classifyZone(h(bedtime), v('00:30'))).toBe('tolerable')
    expect(classifyZone(h(bedtime), v('01:00'))).toBe('tolerable')
    expect(classifyZone(h(bedtime), v('01:01'))).toBe('bad')
  })
  it('steps', () => {
    expect(classifyZone(h(steps), v(10000))).toBe('excellent')
    expect(classifyZone(h(steps), v(9999))).toBe('tolerable')
    expect(classifyZone(h(steps), v(5000))).toBe('tolerable')
    expect(classifyZone(h(steps), v(4999))).toBe('bad')
  })
  it('social media: tolerable omitted, beyond ok is bad', () => {
    expect(classifyZone(h(social), v(0))).toBe('excellent')
    expect(classifyZone(h(social), v(20))).toBe('ok')
    expect(classifyZone(h(social), v(21))).toBe('bad')
  })
  it('ok zone is skipped when absent', () => {
    const r: ZonedRule = { kind: 'measured', unit: 'count', better: 'lower', excellent: 1, tolerable: 3 }
    expect(classifyZone(h(r), v(2))).toBe('tolerable')
  })
})

describe('classifyZone entries without a zone', () => {
  it('returns null for N/A, unknown and mismatched values', () => {
    const h = { direction: 'constructive' as const, rule: steps }
    expect(classifyZone(h, { kind: 'not_applicable' })).toBeNull()
    expect(classifyZone(h, { kind: 'unknown' })).toBeNull()
    expect(classifyZone(h, v('abc'))).toBeNull()
    expect(classifyZone({ direction: 'constructive', rule: bool }, v(3))).toBeNull()
  })
})
