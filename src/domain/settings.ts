import type { DayKey, Habit, HabitVersion } from './types'

/** Settings in effect for `habit` on `day` (days before the first version use the first). */
export function settingsOn(habit: Habit, day: DayKey): HabitVersion {
  const versions = habit.versions
  let current = versions[0]
  for (const v of versions) {
    if (v.from <= day) current = v
    else break
  }
  return current
}
