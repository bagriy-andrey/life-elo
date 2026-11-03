import type { HabitDirection, HabitOutcome, ImpactTier, Quota, Zone, ZonedRule } from '../domain/types'
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

export const OUTCOME_LABEL: Record<HabitOutcome, string> = {
  done: 'Сделал',
  not_done: 'Не сделал',
  complied: 'Соблюдал',
  violated: 'Нарушил',
  not_applicable: 'Не актуально',
  unknown: 'Не помню',
}

/** Selected-state color for an outcome; accent when absent. */
export const OUTCOME_TONE: Partial<Record<HabitOutcome, 'pos' | 'neg'>> = {
  done: 'pos',
  complied: 'pos',
  violated: 'neg',
}

export const OUTCOMES_FOR: Record<HabitDirection, HabitOutcome[]> = {
  constructive: ['done', 'not_done', 'not_applicable'],
  destructive: ['complied', 'violated', 'not_applicable'],
}

export const formatSigned = (n: number) =>
  n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0'

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
