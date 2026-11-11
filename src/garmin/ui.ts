import type { Habit, GarminMetric } from '../domain/types'
import type { RuleChoice } from '../domain/habitSetup'
import type { HabitDirection } from '../domain/types'

/** Activity types with their own i18n label (`garmin.type.<key>`). */
export const NAMED_ACTIVITY_TYPES = [
  'yoga',
  'strength_training',
  'running',
  'cycling',
  'walking',
  'paddelball',
  'swimming',
  'hiking',
] as const

/** Garmin metrics a habit with this rule can be linked to (steps ↔ steps, bedtime/wake ↔ time, activity ↔ constructive boolean). */
export function compatibleMetrics(kind: RuleChoice, direction: HabitDirection): GarminMetric[] {
  if (kind === 'steps') return ['steps']
  if (kind === 'time') return ['bedtime', 'wake']
  if (kind === 'boolean' && direction === 'constructive') return ['activity']
  return []
}

/** `strength_training` → `Strength training`. */
export function humanizeType(key: string): string {
  const s = key.replace(/_+/g, ' ').trim()
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : key
}

/** Named types first, then any other type keys seen in Garmin data (and already chosen) in a stable order. */
export function activityTypeKeys(seen: Iterable<string>, chosen: readonly string[] = []): string[] {
  const named: string[] = [...NAMED_ACTIVITY_TYPES]
  const extra = [...new Set([...seen, ...chosen])].filter((k) => !named.includes(k)).sort()
  return [...named, ...extra]
}

/** Habit source after the rule/metric edit: dropped when the metric is not compatible with the rule. */
export function buildSource(
  metric: GarminMetric | '',
  activityTypes: readonly string[],
  kind: RuleChoice,
  direction: HabitDirection,
): Habit['source'] {
  if (!metric || !compatibleMetrics(kind, direction).includes(metric)) return undefined
  return metric === 'activity' ? { kind: 'garmin', metric, activityTypes: [...activityTypes] } : { kind: 'garmin', metric }
}

export type KeyExpiry = 'unknown' | 'ok' | 'soon' | 'expired'
const DAY_MS = 86_400_000

export function keyExpiry(keyExpiresAt: string | null, now: number): KeyExpiry {
  if (!keyExpiresAt) return 'unknown'
  const at = Date.parse(keyExpiresAt)
  if (Number.isNaN(at)) return 'unknown'
  if (at <= now) return 'expired'
  return at - now < 7 * DAY_MS ? 'soon' : 'ok'
}
