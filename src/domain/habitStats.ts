// Pure stats for the habit page (spec 12). Derived from confirmed reviews only; nothing is stored.
import { classifyZone } from '../engine/zones'
import { weekOf, weeklyTarget } from '../engine/weeklyGoal'
import { addDays, eachDay, timeToMinutes } from './day'
import { settingsOn } from './settings'
import type { DayKey, DayReview, Habit, HabitEntry } from './types'

export type ChartKind = 'yesno' | 'weekly' | 'amount' | 'time'

/** `skipped` = not applicable; `nodata` = no review / unknown; `empty` = before the habit start; `future` = today and later. */
export type DayStatus = 'success' | 'fail' | 'tolerable' | 'skipped' | 'nodata' | 'empty' | 'future'

export interface DayCell {
  day: DayKey
  status: DayStatus
  value?: boolean | number | string
}

export interface HabitNorms {
  /** Constructive goal line (`excellent`); weekly: times per week. */
  target?: number
  /** Destructive norm: last non-bad bound, lowered to `quota.perDay`; weekly: `quota.perWeek`. */
  limit?: number
  /** Time only: end of the «tolerable» zone in minutes (display default: target + 30 min). */
  tolerableBound?: number
  unit: 'boolean' | 'count' | 'minutes' | 'steps' | 'time'
  better: 'higher' | 'lower'
}

export interface WeekResult {
  weekStart: DayKey
  count: number
  target: number
  met: boolean | null
}

const TOLERABLE_DEFAULT_MIN = 30
const WINDOW_DAYS = 30
const WINDOW_WEEKS = 12

const isWeeklyHabit = (habit: Habit, day: DayKey) => {
  const v = settingsOn(habit, day)
  if (v.rule.kind !== 'boolean') return false
  return habit.direction === 'constructive' ? v.weeklyGoal !== undefined : v.quota?.perWeek !== undefined
}

export function chartKind(habit: Habit, day: DayKey): ChartKind {
  const { rule } = settingsOn(habit, day)
  if (rule.kind === 'boolean') return isWeeklyHabit(habit, day) ? 'weekly' : 'yesno'
  return rule.unit === 'time' ? 'time' : 'amount'
}

function entryFor(reviews: DayReview[], habitId: string): Map<DayKey, HabitEntry> {
  const map = new Map<DayKey, HabitEntry>()
  for (const r of reviews) {
    const e = r.entries[habitId]
    if (e) map.set(r.day, e)
  }
  return map
}

function statusOf(habit: Habit, day: DayKey, entry: HabitEntry | undefined): DayStatus {
  if (!entry || entry.kind === 'unknown') return 'nodata'
  if (entry.kind === 'not_applicable') return 'skipped'
  const { rule } = settingsOn(habit, day)
  if (rule.kind === 'boolean') {
    if (typeof entry.value !== 'boolean') return 'nodata'
    // Destructive: true = held (did not slip), false = slipped.
    return entry.value ? 'success' : 'fail'
  }
  const zone = classifyZone({ direction: habit.direction, rule }, entry)
  if (zone === null) return 'nodata'
  if (zone === 'excellent' || zone === 'ok') return 'success'
  if (zone === 'tolerable' && rule.unit === 'time') return 'tolerable'
  return 'fail'
}

function buildCells(habit: Habit, byDay: Map<DayKey, HabitEntry>, from: DayKey, to: DayKey, today: DayKey): DayCell[] {
  return eachDay(from, to).map((day): DayCell => {
    if (day < habit.effectiveFrom) return { day, status: 'empty' }
    if (day >= today) return { day, status: 'future' }
    const entry = byDay.get(day)
    const status = statusOf(habit, day, entry)
    return entry?.kind === 'value' && status !== 'nodata' ? { day, status, value: entry.value } : { day, status }
  })
}

/** One cell per day, inclusive range. */
export function dayCells(habit: Habit, reviews: DayReview[], from: DayKey, to: DayKey, today: DayKey): DayCell[] {
  return buildCells(habit, entryFor(reviews, habit.id), from, to, today)
}

const numeric = (unit: HabitNorms['unit'], v: number | string | undefined): number | undefined => {
  if (v === undefined) return undefined
  if (unit === 'time') return typeof v === 'string' ? timeToMinutes(v) : undefined
  return typeof v === 'number' ? v : undefined
}

export function habitNorms(habit: Habit, day: DayKey): HabitNorms {
  const version = settingsOn(habit, day)
  const { rule } = version
  if (rule.kind === 'boolean') {
    return {
      unit: 'boolean',
      better: habit.direction === 'constructive' ? 'higher' : 'lower',
      ...(habit.direction === 'constructive'
        ? { target: version.weeklyGoal?.perWeek }
        : { limit: version.quota?.perWeek }),
    }
  }
  const { unit, better } = rule
  const target = numeric(unit, rule.excellent)
  const norms: HabitNorms = { unit, better, target }
  if (unit === 'time') {
    const tolerable = numeric(unit, rule.tolerable)
    norms.tolerableBound = tolerable ?? (target === undefined ? undefined : target + TOLERABLE_DEFAULT_MIN)
  }
  if (habit.direction === 'destructive') {
    const bound = numeric(unit, rule.tolerable) ?? numeric(unit, rule.ok) ?? target
    const perDay = version.quota?.perDay
    norms.limit = bound !== undefined && perDay !== undefined ? Math.min(bound, perDay) : (bound ?? perDay)
  }
  return norms
}

const yesterdayOf = (today: DayKey) => addDays(today, -1)

/** Daily streak walk: success +1; skipped is neutral; fail/tolerable/nodata reset. */
function runs(cells: DayCell[]): { current: number; best: number } {
  let run = 0
  let best = 0
  for (const c of cells) {
    if (c.status === 'success') {
      run += 1
      best = Math.max(best, run)
    } else if (c.status === 'fail' || c.status === 'tolerable' || c.status === 'nodata') run = 0
  }
  return { current: run, best }
}

function historyCells(habit: Habit, reviews: DayReview[], today: DayKey): DayCell[] {
  return dayCells(habit, reviews, habit.effectiveFrom, yesterdayOf(today), today)
}

/** Consecutive successful days up to yesterday; today without an answer never breaks it. */
export function currentStreak(habit: Habit, reviews: DayReview[], today: DayKey): number {
  return runs(historyCells(habit, reviews, today)).current
}

export function bestStreak(habit: Habit, reviews: DayReview[], today: DayKey): number {
  return runs(historyCells(habit, reviews, today)).best
}

/** Mon–Sun weeks touching `from`..`to` with the event count and the week verdict. */
export function weekResults(habit: Habit, reviews: DayReview[], from: DayKey, to: DayKey, today: DayKey): WeekResult[] {
  const byDay = entryFor(reviews, habit.id)
  const results: WeekResult[] = []
  for (let ws = weekOf(from); ws <= to; ws = addDays(ws, 7)) {
    const we = addDays(ws, 6)
    const cells = buildCells(habit, byDay, ws, we, today)
    const norms = habitNorms(habit, we < today ? we : today)
    const eventStatus: DayStatus = habit.direction === 'constructive' ? 'success' : 'fail'
    const count = cells.filter((c) => c.status === eventStatus).length
    const tracked = cells.filter((c) => c.status !== 'empty').length
    const hasData = cells.some((c) => c.status !== 'empty' && c.status !== 'future' && c.status !== 'nodata')
    const ended = we < today
    let target = 0
    let met: boolean | null = null
    if (habit.direction === 'constructive') {
      if (norms.target !== undefined) {
        target = weeklyTarget(norms.target, tracked)
        if (tracked > 0) met = count >= target ? true : ended && hasData ? false : null
      }
    } else if (norms.limit !== undefined) {
      target = norms.limit
      if (tracked > 0) met = count > target ? false : ended && hasData ? true : null
    }
    results.push({ weekStart: ws, count, target, met })
  }
  return results
}

/** Weekly habits: consecutive met weeks. The running week counts only when met (never for destructive). */
export function weekStreaks(habit: Habit, reviews: DayReview[], today: DayKey): { current: number; best: number } {
  const weeks = weekResults(habit, reviews, habit.effectiveFrom, yesterdayOf(today), today)
  const thisWeek = weekOf(today)
  let run = 0
  let best = 0
  for (const w of weeks) {
    const running = w.weekStart === thisWeek
    if (running && (habit.direction === 'destructive' || w.met !== true)) continue
    if (w.met === true) {
      run += 1
      best = Math.max(best, run)
    } else run = 0
  }
  return { current: run, best }
}

const percent = (part: number, total: number): number | null => (total === 0 ? null : Math.round((part / total) * 100))

function successShare(cells: DayCell[]): number | null {
  const evaluated = cells.filter((c) => c.status === 'success' || c.status === 'fail' || c.status === 'tolerable')
  return percent(evaluated.filter((c) => c.status === 'success').length, evaluated.length)
}

/** Last 30 days before today (weekly habits: last 12 weeks). `null` when nothing was evaluated. */
export function completionPercent(habit: Habit, reviews: DayReview[], today: DayKey): number | null {
  if (chartKind(habit, today) === 'weekly') {
    const from = addDays(weekOf(today), -7 * (WINDOW_WEEKS - 1))
    const thisWeek = weekOf(today)
    const weeks = weekResults(habit, reviews, from, today, today).filter(
      (w) => w.met !== null && !(w.weekStart === thisWeek && habit.direction === 'destructive'),
    )
    return percent(weeks.filter((w) => w.met === true).length, weeks.length)
  }
  return successShare(dayCells(habit, reviews, addDays(today, -WINDOW_DAYS), yesterdayOf(today), today))
}

/** Mon..Sun: % successful days over the last 12 months; `null` for a weekday with no evaluated days. */
export function weekdayPercent(habit: Habit, reviews: DayReview[], today: DayKey): (number | null)[] {
  const cells = dayCells(habit, reviews, addDays(today, -365), yesterdayOf(today), today)
  const buckets: DayCell[][] = Array.from({ length: 7 }, () => [])
  for (const c of cells) {
    const [y, m, d] = c.day.split('-').map(Number)
    buckets[(new Date(y, m - 1, d).getDay() + 6) % 7].push(c)
  }
  return buckets.map(successShare)
}
