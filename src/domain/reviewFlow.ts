import { isDayLocked, reviewDay } from './day'
import { settingsOn } from './settings'
import type { DayKey, DayReview, Habit, HabitDirection, HabitEntry, Quota, ZonedRule } from './types'

export type CardStage = 'boolean' | 'numeric' | 'time'

export interface ReviewCard {
  habitId: string
  stage: CardStage
  direction: HabitDirection
  quota?: Quota
  /** Weekly limit settings; only for destructive habits with `perWeek`. */
  weekly?: Quota
}

/** Typo guards (not scoring). */
export const MAX_BY_UNIT = { steps: 100000, minutes: 1440, count: 1000 } as const
export type NumericUnit = keyof typeof MAX_BY_UNIT

const STEP_BY_UNIT: Record<NumericUnit, number> = { steps: 500, minutes: 5, count: 1 }

export const isApplicable = (h: Habit, day: DayKey) => h.active && h.effectiveFrom <= day

function stageOf(rule: ZonedRule, quota: Quota | undefined): CardStage {
  if (quota) return quota.perDay !== undefined && quota.perDay > 1 ? 'numeric' : 'boolean'
  if (rule.kind === 'boolean') return 'boolean'
  return rule.unit === 'time' ? 'time' : 'numeric'
}

const STAGE_ORDER: Record<CardStage, number> = { boolean: 0, numeric: 1, time: 1 }

/** Cards for all habits applicable on `day`: yes/no first, then numeric/time; each by `createdAt`. */
export function buildCards(habits: Habit[], day: DayKey): ReviewCard[] {
  return habits
    .filter((h) => isApplicable(h, day))
    .map((h) => {
      const { rule, quota } = settingsOn(h, day)
      const card: ReviewCard = { habitId: h.id, stage: stageOf(rule, quota), direction: h.direction }
      if (quota) card.quota = quota
      if (h.direction === 'destructive' && quota?.perWeek !== undefined) card.weekly = quota
      return { card, createdAt: h.createdAt }
    })
    .sort((a, b) => STAGE_ORDER[a.card.stage] - STAGE_ORDER[b.card.stage] || a.createdAt - b.createdAt)
    .map((x) => x.card)
}

/**
 * Yes/no answer. Constructive: good = true, bad = false. Destructive: good ("held back") = false,
 * bad ("slipped" / "had it") = true (counts as 1 for quota habits).
 */
export function entryForYesNo(direction: HabitDirection, answer: 'good' | 'bad'): HabitEntry {
  const good = answer === 'good'
  return { kind: 'value', value: direction === 'constructive' ? good : !good }
}

export type ParseError = 'empty' | 'invalid' | 'max'
export type NumericResult = { ok: true; value: number } | { ok: false; error: ParseError }
export type TimeResult = { ok: true; value: string } | { ok: false; error: ParseError }

export function parseNumeric(text: string, unit: NumericUnit): NumericResult {
  const t = text.trim()
  if (t === '') return { ok: false, error: 'empty' }
  if (!/^\d+$/.test(t)) return { ok: false, error: 'invalid' }
  const value = Number(t)
  if (!Number.isSafeInteger(value)) return { ok: false, error: 'max' }
  if (value > MAX_BY_UNIT[unit]) return { ok: false, error: 'max' }
  return { ok: true, value }
}

/** `H:MM` / `HH:MM` (00:00-23:59) -> zero-padded `HH:MM`. */
export function parseTime(text: string): TimeResult {
  const t = text.trim()
  if (t === '') return { ok: false, error: 'empty' }
  const m = /^(\d{1,2}):(\d{2})$/.exec(t)
  if (!m) return { ok: false, error: 'invalid' }
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return { ok: false, error: 'invalid' }
  return { ok: true, value: `${String(h).padStart(2, '0')}:${m[2]}` }
}

export const stepFor = (unit: NumericUnit): number => STEP_BY_UNIT[unit]

export interface GoalLabelParts {
  unit: 'count' | 'minutes' | 'steps' | 'time'
  value: number | string
  better: 'lower' | 'higher'
}

/** Raw parts of the goal label (from `excellent`); `null` for boolean rules. UI formats the text. */
export function goalLabelParts(rule: ZonedRule): GoalLabelParts | null {
  if (rule.kind !== 'measured') return null
  return { unit: rule.unit, value: rule.excellent, better: rule.better }
}

export interface ShowInput {
  habits: Habit[]
  reviews: DayReview[]
  now: Date
  /** `getSyncState().lastSyncedAt`; unset until the first sync completed on this device. */
  lastSyncedAt?: number | null
}

/** Whether the mandatory yesterday-review modal is due (caller checks signed-in). */
export function shouldShowYesterdayReview({ habits, reviews, now, lastSyncedAt }: ShowInput): boolean {
  if (!lastSyncedAt) return false
  const day = reviewDay(now)
  if (isDayLocked(day, now)) return false
  if (reviews.some((r) => r.day === day)) return false
  return buildCards(habits, day).length > 0
}
