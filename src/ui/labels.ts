import type { HabitDirection, HabitVersion, ImpactTier, Quota, Zone, ZonedRule } from '../domain/types'
import { ageOn } from '../domain/profile'
import type { RuleChoice } from '../domain/habitSetup'
import type { I18n } from '../i18n'

type T = I18n['t']
type Unit = Extract<ZonedRule, { kind: 'measured' }>['unit']

const TIERS: ImpactTier[] = ['weak', 'medium', 'strong']
const DIRECTIONS: HabitDirection[] = ['constructive', 'destructive']
const ZONES: Zone[] = ['excellent', 'ok', 'tolerable', 'bad']
const UNITS: Unit[] = ['count', 'minutes', 'steps', 'time']
const RULE_CHOICES: RuleChoice[] = ['boolean', 'count', 'minutes', 'steps', 'time']

const mapOf = <K extends string>(keys: K[], label: (k: K) => string) =>
  Object.fromEntries(keys.map((k) => [k, label(k)])) as Record<K, string>

export const tierLabels = (t: T) => mapOf(TIERS, (k) => t(`tier.${k}`))
export const tierGroupLabels = (t: T) => mapOf(TIERS, (k) => t(`tierGroup.${k}`))
export const directionLabels = (t: T) => mapOf(DIRECTIONS, (k) => t(`direction.${k}`))
/** Short names used in the habit edit form. */
export const directionEditLabels = (t: T) => mapOf(DIRECTIONS, (k) => t(`directionEdit.${k}`))
export const directionGroupLabels = (t: T) => mapOf(DIRECTIONS, (k) => t(`directionGroup.${k}`))
export const zoneLabels = (t: T) => mapOf(ZONES, (k) => t(`zone.${k}`))
/** Plural-aware: pass the displayed value as `count`. */
export const unitLabels = (t: T, count = 0) => mapOf(UNITS, (k) => t(`unit.${k}`, { count }))
export const ruleChoiceLabels = (t: T) => mapOf(RULE_CHOICES, (k) => t(`ruleChoice.${k}`))
export const notApplicableLabel = (t: T) => t('answer.na')

/** Tier color (weight, not good/bad): green/red stay reserved for results (points, zones). */
export const TIER_COLOR: Record<ImpactTier, string> = {
  strong: 'var(--tier-strong)',
  medium: 'var(--tier-medium)',
  weak: 'var(--tier-weak)',
}

/** Answer options for a boolean habit; `value` is the string form of the stored entry. */
export type BooleanAnswer = 'true' | 'false' | 'na'

export const booleanOptions = (
  t: T,
): Record<HabitDirection, { value: BooleanAnswer; label: string; tone?: 'pos' | 'neg' }[]> => ({
  constructive: [
    { value: 'true', label: t('answer.constructive.true'), tone: 'pos' },
    { value: 'false', label: t('answer.constructive.false') },
    { value: 'na', label: t('answer.na') },
  ],
  destructive: [
    { value: 'true', label: t('answer.destructive.true'), tone: 'pos' },
    { value: 'false', label: t('answer.destructive.false'), tone: 'neg' },
    { value: 'na', label: t('answer.na') },
  ],
})

/** Signed number with U+2212 minus, rounded to `digits` (points: 2, rating: 1), no trailing zeros. */
export const formatSigned = (n: number, digits = 2) => {
  const r = Number(Math.abs(n).toFixed(digits))
  return r === 0 ? '0' : n > 0 ? `+${r}` : `−${r}`
}

/** A rating value (not a change): only negatives get a sign, «−12.5» / «60.9». */
export const formatRating = (n: number, digits = 1) => formatSigned(n, digits).replace('+', '')

export const formatDay = (day: string, locale: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })

/** One-line summary of a rule, e.g. «Отлично ≤ 0 раз · В рамках ≤ 1 раз». */
export function ruleSummary(t: T, rule: ZonedRule): string {
  if (rule.kind === 'boolean') return t('ruleChoice.boolean')
  const sign = rule.better === 'lower' ? '≤' : '≥'
  const unit = rule.unit
  const withUnit = (v: number | string) => (unit === 'time' ? `${v}` : `${v} ${t(`unit.${unit}`, { count: Number(v) })}`)
  const part = (zone: 'excellent' | 'ok' | 'tolerable', v: number | string) =>
    t('rule.zoneValue', { zone: t(`zone.${zone}`), value: `${sign} ${withUnit(v)}` })
  const parts = [part('excellent', rule.excellent)]
  if (rule.ok !== undefined) parts.push(part('ok', rule.ok))
  if (rule.tolerable !== undefined) parts.push(part('tolerable', rule.tolerable))
  return parts.join(' · ')
}

/** Quota summary; `nameOf` resolves the reducer habit id to a name. */
export function quotaSummary(t: T, quota: Quota, nameOf: (id: string) => string | undefined): string {
  const parts: string[] = []
  if (quota.perDay !== undefined) parts.push(t('quota.perDay', { count: quota.perDay }))
  if (quota.perWeek !== undefined) parts.push(t('quota.perWeek', { count: quota.perWeek }))
  const joined = parts.join(', ')
  return quota.reducedByDaysOf
    ? t('quota.summaryReduced', { parts: joined, name: nameOf(quota.reducedByDaysOf) ?? '?' })
    : t('quota.summary', { parts: joined })
}

/** «14 мая 1996 · 30 лет». `today` is a calendar date (toDayKey), not a review day. */
export const formatBirth = (birth: string, today: string, t: T, locale: string) =>
  `${new Date(`${birth}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })} · ${t('profile.age', { count: ageOn(birth, today) })}`

/** Norm part of a habit card meta line: weekly goal/limit, measured threshold or plain yes/no. */
export function normSummary(t: T, version: Pick<HabitVersion, 'rule' | 'quota' | 'weeklyGoal'>, direction: HabitDirection): string {
  const { rule, quota, weeklyGoal } = version
  if (rule.kind === 'boolean') {
    if (weeklyGoal) return t('habits.metaWeekGoal', { count: weeklyGoal.perWeek })
    if (quota?.perWeek !== undefined) return t('habits.metaWeekLimit', { count: quota.perWeek })
    return t('ruleChoice.boolean')
  }
  const value = rule.excellent
  if (rule.unit === 'time') {
    return t(direction === 'constructive' ? 'habits.metaBy' : 'habits.metaNotLater', { value })
  }
  const unit = t(`unit.${rule.unit}`, { count: Number(value) })
  if (rule.better === 'lower') {
    if (quota?.perDay === undefined && quota?.perWeek !== undefined) {
      return t('habits.metaMaxWeek', { value: quota.perWeek, unit: t(`unit.${rule.unit}`, { count: quota.perWeek }) })
    }
    return t('habits.metaMaxDay', { value, unit })
  }
  return t('habits.metaMinDay', { value, unit })
}

/** «Тип · Важность · норма» under the habit name. */
export function habitMeta(t: T, direction: HabitDirection, version: HabitVersion): string {
  return t('habits.meta', {
    kind: directionLabels(t)[direction],
    tier: tierLabels(t)[version.tier],
    norm: normSummary(t, version, direction),
  })
}
