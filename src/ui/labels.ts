import type { HabitDirection, ImpactTier, Quota, Zone, ZonedRule } from '../domain/types'
import type { RuleChoice } from '../domain/habitSetup'

export const TIER_LABEL: Record<ImpactTier, string> = {
  weak: 'Слабая',
  medium: 'Средняя',
  strong: 'Сильная',
}

export const DIRECTION_LABEL: Record<HabitDirection, string> = {
  constructive: 'Конструктивная',
  destructive: 'Нежелательная',
}

export const DIRECTION_GROUP_LABEL: Record<HabitDirection, string> = {
  constructive: '＋ Полезные',
  destructive: '− Вредные',
}

/** Tier color (weight, not good/bad): green/red stay reserved for results (points, zones). */
export const TIER_COLOR: Record<ImpactTier, string> = {
  strong: 'var(--tier-strong)',
  medium: 'var(--tier-medium)',
  weak: 'var(--tier-weak)',
}

export const TIER_GROUP_LABEL: Record<ImpactTier, string> = {
  strong: 'Сильные',
  medium: 'Средние',
  weak: 'Слабые',
}

export const ZONE_LABEL: Record<Zone, string> = {
  excellent: 'Отлично',
  ok: 'В рамках',
  tolerable: 'Терпимо',
  bad: 'Плохо',
}

export const UNIT_LABEL: Record<Extract<ZonedRule, { kind: 'measured' }>['unit'], string> = {
  count: 'раз',
  minutes: 'мин',
  steps: 'шагов',
  time: 'время',
}

/** Answer options for a boolean habit; `value` is the string form of the stored entry. */
export type BooleanAnswer = 'true' | 'false' | 'na'

export const BOOLEAN_OPTIONS: Record<
  HabitDirection,
  { value: BooleanAnswer; label: string; tone?: 'pos' | 'neg' }[]
> = {
  constructive: [
    { value: 'true', label: 'Сделал', tone: 'pos' },
    { value: 'false', label: 'Не сделал' },
    { value: 'na', label: 'Не актуально' },
  ],
  destructive: [
    { value: 'true', label: 'Соблюдал', tone: 'pos' },
    { value: 'false', label: 'Нарушил', tone: 'neg' },
    { value: 'na', label: 'Не актуально' },
  ],
}

export const NOT_APPLICABLE_LABEL = 'Не актуально'

/** Signed number with U+2212 minus, rounded to `digits` (points: 2, rating: 1), no trailing zeros. */
export const formatSigned = (n: number, digits = 2) => {
  const r = Number(Math.abs(n).toFixed(digits))
  return r === 0 ? '0' : n > 0 ? `+${r}` : `−${r}`
}

export const formatDay = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })

export const RULE_CHOICE_LABEL: Record<RuleChoice, string> = {
  boolean: 'Да/нет',
  count: 'Число',
  minutes: 'Минуты',
  steps: 'Шаги',
  time: 'Время',
}

export const BETTER_LABEL = { lower: 'Меньше — лучше', higher: 'Больше — лучше' } as const

const UNIT_SUFFIX: Record<Extract<ZonedRule, { kind: 'measured' }>['unit'], string> = {
  count: ' раз',
  minutes: ' мин',
  steps: ' шагов',
  time: '',
}

/** One-line summary of a rule, e.g. «Отлично ≤ 0 раз · В рамках ≤ 1 раз». */
export function ruleSummary(rule: ZonedRule): string {
  if (rule.kind === 'boolean') return 'Да/нет'
  const sign = rule.better === 'lower' ? '≤' : '≥'
  const fmt = (v: number | string) => `${sign} ${v}${UNIT_SUFFIX[rule.unit]}`
  const parts = [`Отлично ${fmt(rule.excellent)}`]
  if (rule.ok !== undefined) parts.push(`В рамках ${fmt(rule.ok)}`)
  if (rule.tolerable !== undefined) parts.push(`Терпимо ${fmt(rule.tolerable)}`)
  return parts.join(' · ')
}

/** Quota summary; `nameOf` resolves the reducer habit id to a name. */
export function quotaSummary(quota: Quota, nameOf: (id: string) => string | undefined): string {
  const parts: string[] = []
  if (quota.perDay !== undefined) parts.push(`${quota.perDay}/день`)
  if (quota.perWeek !== undefined) parts.push(`${quota.perWeek}/неделю`)
  let text = `Лимит ${parts.join(', ')}`
  if (quota.reducedByDaysOf) text += ` (уменьшается днями «${nameOf(quota.reducedByDaysOf) ?? '?'}»)`
  return text
}
