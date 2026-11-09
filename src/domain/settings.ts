import type { DayKey, Habit, HabitVersion } from './types'

/**
 * Settings in effect for `habit` on `day` (days before the first version use the first).
 * Constructive count/minutes/steps rules are always «higher is better»: the old setup form defaulted to
 * `lower` and its switch is gone, so a stored `lower` there is a setup mistake, corrected for all days.
 */
export function settingsOn(habit: Habit, day: DayKey): HabitVersion {
  const versions = habit.versions
  let current = versions[0]
  for (const v of versions) {
    if (v.from <= day) current = v
    else break
  }
  const { rule } = current
  if (habit.direction === 'constructive' && rule.kind === 'measured' && rule.unit !== 'time' && rule.better === 'lower') {
    return { ...current, rule: { ...rule, better: 'higher' } }
  }
  return current
}
