import { timeToMinutes } from '../domain/day'
import type { Habit, HabitEntry, Zone, ZonedRule } from '../domain/types'

type Measured = Extract<ZonedRule, { kind: 'measured' }>

/** Habit settings relevant to zoning (use `settingsOn(habit, day).rule` for `rule`). */
export type ZonedHabit = Pick<Habit, 'direction'> & { rule: ZonedRule }

function toNumber(unit: Measured['unit'], v: number | string): number | null {
  if (unit === 'time') {
    if (typeof v !== 'string') return null
    const minutes = timeToMinutes(v)
    return Number.isNaN(minutes) ? null : minutes
  }
  return typeof v === 'number' ? v : null
}

function classifyMeasured(rule: Measured, raw: boolean | number | string): Zone | null {
  const value = toNumber(rule.unit, raw as number | string)
  const excellent = toNumber(rule.unit, rule.excellent)
  if (value === null || excellent === null) return null
  const ok = rule.ok === undefined ? undefined : toNumber(rule.unit, rule.ok)
  const tolerable = rule.tolerable === undefined ? undefined : toNumber(rule.unit, rule.tolerable)
  if (ok === null || tolerable === null) return null
  // Inclusive bounds on the good side; mirror for `higher` by negating.
  const sign = rule.better === 'lower' ? 1 : -1
  const within = (bound: number | undefined) => bound !== undefined && sign * value <= sign * bound
  if (within(excellent)) return 'excellent'
  if (within(ok)) return 'ok'
  if (within(tolerable)) return 'tolerable'
  return 'bad'
}

/**
 * Zone of one day's entry for a habit, or `null` when the entry has no zone
 * (not applicable, unknown, or a value that does not fit the rule).
 */
export function classifyZone(habit: ZonedHabit, entry: HabitEntry): Zone | null {
  if (entry.kind !== 'value') return null
  const { rule } = habit
  if (rule.kind === 'boolean') {
    if (typeof entry.value !== 'boolean') return null
    if (habit.direction === 'constructive') return entry.value ? 'excellent' : 'tolerable'
    return entry.value ? 'ok' : 'bad'
  }
  return classifyMeasured(rule, entry.value)
}
