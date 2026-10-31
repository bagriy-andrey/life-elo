import type { HabitDirection, HabitOutcome, ImpactTier } from '../domain/types'

export const TIER_LABEL: Record<ImpactTier, string> = {
  weak: 'Слабая',
  medium: 'Средняя',
  strong: 'Сильная',
}

export const DIRECTION_LABEL: Record<HabitDirection, string> = {
  constructive: 'Конструктивная',
  destructive: 'Нежелательная',
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
