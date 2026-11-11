import { addDays } from './day'
import { isApplicable } from './reviewFlow'
import { settingsOn } from './settings'
import type { DayKey, GarminDay, Habit, HabitEntry } from './types'

function entryFor(habit: Habit, day: DayKey, garmin: Record<DayKey, GarminDay>): HabitEntry | undefined {
  const src = habit.source
  if (!src || src.kind !== 'garmin') return undefined
  const rule = settingsOn(habit, day).rule
  const measured = rule.kind === 'measured' ? rule : undefined

  switch (src.metric) {
    case 'steps': {
      if (measured?.unit !== 'steps') return undefined
      const steps = garmin[day]?.steps
      return steps === undefined ? undefined : { kind: 'value', value: steps }
    }
    case 'bedtime': {
      if (measured?.unit !== 'time') return undefined
      // Garmin dates the night X→X+1 as X+1.
      const t = garmin[addDays(day, 1)]?.sleepStart
      return t ? { kind: 'value', value: t } : undefined
    }
    case 'wake': {
      if (measured?.unit !== 'time') return undefined
      const t = garmin[day]?.sleepEnd
      return t ? { kind: 'value', value: t } : undefined
    }
    case 'activity': {
      if (rule.kind !== 'boolean' || habit.direction !== 'constructive') return undefined
      const types = src.activityTypes ?? []
      const hit = garmin[day]?.activities.some((a) => types.includes(a.type))
      return hit ? { kind: 'value', value: true } : undefined
    }
  }
}

/** Review answers suggested by Garmin data for `day`. Missing data → no key (never "no"). */
export function prefillFromGarmin(
  habits: Habit[],
  day: DayKey,
  garminByDay: Record<DayKey, GarminDay>,
): Record<string, HabitEntry> {
  const out: Record<string, HabitEntry> = {}
  for (const habit of habits) {
    if (!isApplicable(habit, day)) continue
    const entry = entryFor(habit, day, garminByDay)
    if (entry) out[habit.id] = entry
  }
  return out
}
