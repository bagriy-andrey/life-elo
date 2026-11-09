import { timeToMinutes } from './day'
import { settingsOn } from './settings'
import type {
  DayKey,
  DayReview,
  Habit,
  HabitDirection,
  HabitVersion,
  ImpactTier,
  Quota,
  WeeklyGoal,
  ZonedRule,
} from './types'

/** Rule kinds offered in the setup form. */
export type RuleChoice = 'boolean' | 'count' | 'minutes' | 'steps' | 'time'

/** Raw text form state; thresholds are strings as typed. */
export interface HabitForm {
  kind: RuleChoice
  /** Only set from a stored rule (or an explicit choice); otherwise derived from the direction. */
  better?: 'lower' | 'higher'
  /** Yes/no habits only; ignored for measured kinds. */
  period: 'day' | 'week'
  /** Weekly target as typed (constructive 1-7 days, destructive 0-6 «yes» days). */
  weeklyTarget: string
  excellent: string
  ok: string
  tolerable: string
  perDay: string
  perWeek: string
  reducedByDaysOf: string
}

export const EMPTY_FORM: HabitForm = {
  kind: 'boolean',
  period: 'day',
  weeklyTarget: '',
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
  | 'habitError.weeklyTarget'
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

/** Constructive: higher is better (time: earlier, i.e. «do by»); destructive: lower («not later than»). */
export function deriveBetter(direction: HabitDirection, kind: RuleChoice): 'lower' | 'higher' {
  if (direction === 'destructive') return 'lower'
  return kind === 'time' ? 'lower' : 'higher'
}

/** Build a validated rule from the form; thresholds must be ordered on the good side. */
export function buildRule(form: HabitForm, direction: HabitDirection): Result<ZonedRule> {
  if (form.kind === 'boolean') return { ok: true, value: { kind: 'boolean' } }
  const kind = form.kind
  const excellent = threshold(kind, form.excellent)
  const ok = threshold(kind, form.ok)
  const tolerable = threshold(kind, form.tolerable)
  if (excellent === undefined) return fail('habitError.excellentRequired')
  if (excellent === null || ok === null || tolerable === null) return fail('habitError.badThreshold')
  const num = (v: number | string) => (kind === 'time' ? timeToMinutes(v as string) : (v as number))
  const better = form.better ?? deriveBetter(direction, kind)
  const sign = better === 'lower' ? 1 : -1
  const chain = [excellent, ok, tolerable].filter((v): v is number | string => v !== undefined)
  for (let i = 1; i < chain.length; i++) {
    if (sign * num(chain[i]) < sign * num(chain[i - 1])) return fail('habitError.thresholdOrder')
  }
  const rule: ZonedRule = { kind: 'measured', unit: kind, better, excellent }
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

function weekCount(raw: string, min: number, max: number): number | null {
  const text = raw.trim()
  if (!/^\d+$/.test(text)) return null
  const n = Number(text)
  return n >= min && n <= max ? n : null
}

/**
 * Build the optional quota. Count habits: per-day/per-week limits and reducer.
 * Destructive yes/no with period «week»: `{ perWeek }` (0-6 «yes» days). `undefined` value = no quota.
 */
export function buildQuota(form: HabitForm, direction: HabitDirection): Result<Quota | undefined> {
  if (form.kind === 'boolean') {
    if (direction !== 'destructive' || form.period !== 'week') return { ok: true, value: undefined }
    const perWeek = weekCount(form.weeklyTarget, 0, 6)
    if (perWeek === null) return fail('habitError.weeklyTarget')
    return { ok: true, value: { perWeek } }
  }
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

/** Constructive yes/no with period «week»: `{ perWeek }` (1-7 days); otherwise `undefined`. */
export function buildWeeklyGoal(form: HabitForm, direction: HabitDirection): Result<WeeklyGoal | undefined> {
  if (form.kind !== 'boolean' || direction !== 'constructive' || form.period !== 'week') {
    return { ok: true, value: undefined }
  }
  const perWeek = weekCount(form.weeklyTarget, 1, 7)
  if (perWeek === null) return fail('habitError.weeklyTarget')
  return { ok: true, value: { perWeek } }
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
  if (next.weeklyGoal) version.weeklyGoal = next.weeklyGoal
  return upsertVersion(existing, version)
}

/** Form state prefilled from the settings in effect (keeps a stored `better` as is). */
export function formOf(version: HabitVersion): HabitForm {
  const { rule, quota, weeklyGoal } = version
  const limits = {
    perDay: quota?.perDay === undefined ? '' : String(quota.perDay),
    perWeek: quota?.perWeek === undefined ? '' : String(quota.perWeek),
    reducedByDaysOf: quota?.reducedByDaysOf ?? '',
  }
  if (rule.kind === 'boolean') {
    const target = weeklyGoal?.perWeek ?? quota?.perWeek
    return {
      ...EMPTY_FORM,
      period: target === undefined ? 'day' : 'week',
      weeklyTarget: target === undefined ? '' : String(target),
    }
  }
  return {
    ...EMPTY_FORM,
    kind: rule.unit,
    better: rule.better,
    excellent: String(rule.excellent),
    ok: rule.ok === undefined ? '' : String(rule.ok),
    tolerable: rule.tolerable === undefined ? '' : String(rule.tolerable),
    ...limits,
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
