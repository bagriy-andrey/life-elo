import { timeToMinutes } from './day'
import { settingsOn } from './settings'
import type { DayKey, DayReview, Habit, HabitVersion, ImpactTier, Quota, ZonedRule } from './types'

/** Rule kinds offered in the setup form. */
export type RuleChoice = 'boolean' | 'count' | 'minutes' | 'steps' | 'time'

/** Raw text form state; thresholds are strings as typed. */
export interface HabitForm {
  kind: RuleChoice
  better: 'lower' | 'higher'
  excellent: string
  ok: string
  tolerable: string
  perDay: string
  perWeek: string
  reducedByDaysOf: string
}

export const EMPTY_FORM: HabitForm = {
  kind: 'boolean',
  better: 'lower',
  excellent: '',
  ok: '',
  tolerable: '',
  perDay: '',
  perWeek: '',
  reducedByDaysOf: '',
}

/** Validation error keys; the UI translates them (they exist in every i18n dictionary). */
export type SetupErrorKey =
  | 'habitError.excellentRequired'
  | 'habitError.badThreshold'
  | 'habitError.thresholdOrder'
  | 'habitError.limitsInteger'
  | 'habitError.reducerNeedsLimit'
  | 'habitError.reducerSelf'
  | 'habitError.reducerMissing'
  | 'habitError.reducerReduced'
  | 'habitError.alreadyReducer'
  | 'habitError.nameEmpty'
  | 'habitError.deleteInUse'

export interface SetupError {
  key: SetupErrorKey
  params?: Record<string, string | number>
}

type Result<T> = { ok: true; value: T } | { ok: false; error: SetupError }
const fail = (key: SetupErrorKey): { ok: false; error: SetupError } => ({ ok: false, error: { key } })

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function threshold(kind: RuleChoice, raw: string): number | string | null | undefined {
  const text = raw.trim()
  if (text === '') return undefined
  if (kind === 'time') return TIME_RE.test(text) ? text : null
  const n = Number(text.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : null
}

/** Build a validated rule from the form; thresholds must be ordered on the good side. */
export function buildRule(form: HabitForm): Result<ZonedRule> {
  if (form.kind === 'boolean') return { ok: true, value: { kind: 'boolean' } }
  const kind = form.kind
  const excellent = threshold(kind, form.excellent)
  const ok = threshold(kind, form.ok)
  const tolerable = threshold(kind, form.tolerable)
  if (excellent === undefined) return fail('habitError.excellentRequired')
  if (excellent === null || ok === null || tolerable === null) return fail('habitError.badThreshold')
  const num = (v: number | string) => (kind === 'time' ? timeToMinutes(v as string) : (v as number))
  const sign = form.better === 'lower' ? 1 : -1
  const chain = [excellent, ok, tolerable].filter((v): v is number | string => v !== undefined)
  for (let i = 1; i < chain.length; i++) {
    if (sign * num(chain[i]) < sign * num(chain[i - 1])) return fail('habitError.thresholdOrder')
  }
  const rule: ZonedRule = { kind: 'measured', unit: kind, better: form.better, excellent }
  if (ok !== undefined) rule.ok = ok
  if (tolerable !== undefined) rule.tolerable = tolerable
  return { ok: true, value: rule }
}

function limit(raw: string): number | null | undefined {
  const text = raw.trim()
  if (text === '') return undefined
  const n = Number(text)
  return Number.isInteger(n) && n >= 0 ? n : null
}

/** Build the optional quota (only for count habits). `undefined` value = no quota. */
export function buildQuota(form: HabitForm): Result<Quota | undefined> {
  if (form.kind !== 'count') return { ok: true, value: undefined }
  const perDay = limit(form.perDay)
  const perWeek = limit(form.perWeek)
  if (perDay === null || perWeek === null) return fail('habitError.limitsInteger')
  const quota: Quota = {}
  if (perDay !== undefined) quota.perDay = perDay
  if (perWeek !== undefined) quota.perWeek = perWeek
  if (form.reducedByDaysOf) {
    if (perDay === undefined && perWeek === undefined) return fail('habitError.reducerNeedsLimit')
    quota.reducedByDaysOf = form.reducedByDaysOf
  }
  return { ok: true, value: Object.keys(quota).length > 0 ? quota : undefined }
}

/**
 * One reducer level only: a habit cannot reduce by itself, a reducer must not itself
 * be reduced, and a habit already used as a reducer cannot become reduced.
 * Checked against settings in effect on `day`.
 */
export function validateReducer(
  habitId: string | undefined,
  quota: Quota | undefined,
  habits: Habit[],
  day: DayKey,
): SetupError | undefined {
  const reducerId = quota?.reducedByDaysOf
  if (!reducerId) return undefined
  if (reducerId === habitId) return { key: 'habitError.reducerSelf' }
  const reducer = habits.find((h) => h.id === reducerId)
  if (!reducer) return { key: 'habitError.reducerMissing' }
  if (settingsOn(reducer, day).quota?.reducedByDaysOf) return { key: 'habitError.reducerReduced' }
  if (
    habitId &&
    habits.some((h) => h.id !== habitId && settingsOn(h, day).quota?.reducedByDaysOf === habitId)
  ) {
    return { key: 'habitError.alreadyReducer' }
  }
  return undefined
}

/** Append `next`, or replace the version that starts the same day; earlier versions are kept. */
export function upsertVersion(versions: HabitVersion[], next: HabitVersion): HabitVersion[] {
  const kept = versions.filter((v) => v.from < next.from)
  return [...kept, next]
}

/** Versions for an edit made on `today`, starting from the habit's current history. */
export function editedVersions(habit: Habit, next: Omit<HabitVersion, 'from'>, today: DayKey): HabitVersion[] {
  const existing = habit.versions
  const from = today > habit.effectiveFrom ? today : habit.effectiveFrom
  const version: HabitVersion = { from, tier: next.tier, rule: next.rule }
  if (next.quota) version.quota = next.quota
  return upsertVersion(existing, version)
}

/** Form state prefilled from existing settings. */
export function formOf(rule: ZonedRule, quota: Quota | undefined): HabitForm {
  if (rule.kind === 'boolean') return { ...EMPTY_FORM }
  return {
    kind: rule.unit,
    better: rule.better,
    excellent: String(rule.excellent),
    ok: rule.ok === undefined ? '' : String(rule.ok),
    tolerable: rule.tolerable === undefined ? '' : String(rule.tolerable),
    perDay: quota?.perDay === undefined ? '' : String(quota.perDay),
    perWeek: quota?.perWeek === undefined ? '' : String(quota.perWeek),
    reducedByDaysOf: quota?.reducedByDaysOf ?? '',
  }
}

export const TIER_KEYS: ImpactTier[] = ['weak', 'medium', 'strong']

/** True when any stored review has a value answer for this habit. */
export function hasAnswers(habitId: string, reviews: DayReview[]): boolean {
  return reviews.some((r) => r.entries[habitId]?.kind === 'value')
}

/** Other habits whose quota uses `habitId` as `reducedByDaysOf` in any version. */
export function reducerUsers(habitId: string, habits: Habit[]): Habit[] {
  return habits.filter(
    (h) => h.id !== habitId && h.versions.some((v) => v.quota?.reducedByDaysOf === habitId),
  )
}

/** Review with the habit's entry removed; other fields untouched. */
export function withoutHabit(review: DayReview, habitId: string): DayReview {
  const { [habitId]: _removed, ...entries } = review.entries
  return { ...review, entries }
}
