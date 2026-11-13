import { addDays } from './day'
import { isApplicable } from './reviewFlow'
import { settingsOn } from './settings'
import type { DayKey, GarminDay, Habit, HabitEntry } from './types'

/** What Garmin data supports a suggested answer (shown as the hint line). */
export type GarminEvidence =
  | { kind: 'steps'; value: number }
  | { kind: 'bedtime'; value: string }
  | { kind: 'wake'; value: string }
  | { kind: 'activity'; type: string; minutes: number }

export interface GarminSuggestion {
  entry: HabitEntry
  evidence: GarminEvidence
}

function suggestionFor(habit: Habit, day: DayKey, garmin: Record<DayKey, GarminDay>): GarminSuggestion | undefined {
  const src = habit.source
  if (!src || src.kind !== 'garmin') return undefined
  const rule = settingsOn(habit, day).rule
  const measured = rule.kind === 'measured' ? rule : undefined

  switch (src.metric) {
    case 'steps': {
      if (measured?.unit !== 'steps') return undefined
      const steps = garmin[day]?.steps
      return steps === undefined ? undefined : { entry: { kind: 'value', value: steps }, evidence: { kind: 'steps', value: steps } }
    }
    case 'bedtime': {
      if (measured?.unit !== 'time') return undefined
      // Garmin dates the night X→X+1 as X+1.
      const t = garmin[addDays(day, 1)]?.sleepStart
      return t ? { entry: { kind: 'value', value: t }, evidence: { kind: 'bedtime', value: t } } : undefined
    }
    case 'wake': {
      if (measured?.unit !== 'time') return undefined
      const t = garmin[day]?.sleepEnd
      return t ? { entry: { kind: 'value', value: t }, evidence: { kind: 'wake', value: t } } : undefined
    }
    case 'activity': {
      if (rule.kind !== 'boolean' || habit.direction !== 'constructive') return undefined
      const types = src.activityTypes ?? []
      const hit = garmin[day]?.activities.find((a) => types.includes(a.type))
      return hit
        ? { entry: { kind: 'value', value: true }, evidence: { kind: 'activity', type: hit.type, minutes: hit.minutes } }
        : undefined
    }
  }
}

/** Suggested answers with their evidence, keyed by habit id. Missing data / unbound / not applicable → no key. */
export function garminEvidence(
  habits: Habit[],
  day: DayKey,
  garminByDay: Record<DayKey, GarminDay>,
): Record<string, GarminSuggestion> {
  const out: Record<string, GarminSuggestion> = {}
  for (const habit of habits) {
    if (!isApplicable(habit, day)) continue
    const s = suggestionFor(habit, day, garminByDay)
    if (s) out[habit.id] = s
  }
  return out
}

/** Review answers suggested by Garmin data for `day`. Missing data → no key (never "no"). */
export function prefillFromGarmin(
  habits: Habit[],
  day: DayKey,
  garminByDay: Record<DayKey, GarminDay>,
): Record<string, HabitEntry> {
  return Object.fromEntries(Object.entries(garminEvidence(habits, day, garminByDay)).map(([id, s]) => [id, s.entry]))
}

/**
 * Fills `answers` from a Garmin prefill for habits that have a card and that the user hasn't answered
 * (`touched`). Returns the new answers and the ids that now hold a Garmin value (those prefilled earlier
 * are refreshed, so late-arriving rows still show up). Never overwrites a touched answer.
 */
export function mergeGarminPrefill(
  prefill: Record<string, HabitEntry>,
  cardIds: readonly string[],
  answers: Record<string, HabitEntry>,
  touched: ReadonlySet<string>,
): { answers: Record<string, HabitEntry>; applied: string[] } {
  const next = { ...answers }
  const applied: string[] = []
  for (const id of cardIds) {
    const entry = prefill[id]
    if (!entry || touched.has(id)) continue
    next[id] = entry
    applied.push(id)
  }
  return { answers: next, applied }
}

/**
 * Review screen merge: the user's own entries (incl. reset → unknown) win; habits the user has not touched
 * get the Garmin suggestion; habits without a suggestion (unbound, no data) get nothing.
 */
export function effectiveEntries(
  entries: Record<string, HabitEntry>,
  suggestions: Record<string, GarminSuggestion>,
): Record<string, HabitEntry> {
  const out = { ...entries }
  for (const [id, s] of Object.entries(suggestions)) if (!(id in out)) out[id] = s.entry
  return out
}
