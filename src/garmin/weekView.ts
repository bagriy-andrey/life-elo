// Pure Mon-Sun week view-model for the day page's WeekChart. Raw numbers only; the UI adds labels.
import { addDays, weekStart } from '../domain/day'
import type { DayKey, GarminDay, GarminDetail } from '../domain/types'
import { clockMinutes } from './dayDigest'

/** Sleep axis: 22:00 .. 10:00. */
const AXIS_START = 22 * 60
const AXIS_SPAN = 12 * 60

export interface WeekViewDay {
  key: DayKey
  /** 0 = Monday .. 6 = Sunday. */
  index: number
  /** Day of month. */
  dayNum: number
  steps?: number
  /** Step goal of that day, else the last known one in the week. */
  goal?: number
  /** Fractions of the 22:00-10:00 axis, clamped to 0..1. */
  sleep?: { startFrac: number; endFrac: number }
  /** Same values as WeekChartDay.state. */
  state: 'selected' | 'past' | 'future' | 'today'
  isToday: boolean
  hasData: boolean
}

export interface WeekView {
  start: DayKey
  end: DayKey
  days: WeekViewDay[]
  /** Goal for the dashed line: the selected day's goal, else the latest known. */
  stepsGoal?: number
  /** Σ(moderate + 2·vigorous) over Monday..min(today, Sunday) from stored details. */
  intensity: { minutes: number; goal?: number; /** every counted day had intensity data */ complete: boolean }
}

/** `HH:MM` pair -> fractions on the 22:00-10:00 axis. Times before noon count as after midnight. */
export function sleepFractions(start: string | undefined, end: string | undefined): { startFrac: number; endFrac: number } | undefined {
  const a = clockMinutes(start)
  const b = clockMinutes(end)
  if (a === undefined || b === undefined) return undefined
  const rel = (m: number) => (m >= 12 * 60 ? m - AXIS_START : m + (24 * 60 - AXIS_START))
  const frac = (m: number) => Math.min(1, Math.max(0, rel(m) / AXIS_SPAN))
  const startFrac = frac(a)
  const endFrac = frac(b)
  return endFrac > startFrac ? { startFrac, endFrac } : undefined
}

const numOf = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
const obj = (v: unknown): Record<string, unknown> | undefined =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined

export function garminWeekView(
  selected: DayKey,
  today: DayKey,
  rows: Record<DayKey, GarminDay | undefined>,
  details: Record<DayKey, GarminDetail | undefined>,
): WeekView {
  const start = weekStart(selected)
  const keys = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const goals = keys.map((k) => numOf(obj(obj(details[k]?.summary?.movement)?.steps)?.goal))
  // Last known goal: carry forward; leading gaps take the first known one.
  let last: number | undefined
  const carried = goals.map((g) => (last = g ?? last))
  const firstKnown = goals.find((g) => g !== undefined)
  const days: WeekViewDay[] = keys.map((key, index) => {
    const row = rows[key]
    const steps = row?.steps ?? numOf(obj(obj(details[key]?.summary?.movement)?.steps)?.value)
    const sleep = sleepFractions(row?.sleepStart, row?.sleepEnd)
    const goal = carried[index] ?? firstKnown
    const state = key === selected ? 'selected' : key > today ? 'future' : key === today ? 'today' : 'past'
    return {
      key,
      index,
      dayNum: Number(key.slice(8, 10)),
      ...(steps !== undefined && { steps }),
      ...(goal !== undefined && { goal }),
      ...(sleep && { sleep }),
      state,
      isToday: key === today,
      hasData: steps !== undefined || sleep !== undefined || details[key] !== undefined,
    }
  })
  let minutes = 0
  let complete = true
  let intensityGoal: number | undefined
  for (const k of keys) {
    if (k > today) break
    const im = obj(details[k]?.summary?.intensityMinutes)
    const mod = numOf(im?.moderate)
    const vig = numOf(im?.vigorous)
    if (mod === undefined && vig === undefined) {
      complete = false
      continue
    }
    minutes += (mod ?? 0) + 2 * (vig ?? 0)
    intensityGoal = numOf(im?.goal) ?? intensityGoal
  }
  const selGoal = days.find((d) => d.key === selected)?.goal
  const stepsGoal = selGoal ?? [...days].reverse().find((d) => d.goal !== undefined)?.goal
  return {
    start,
    end: keys[6],
    days,
    ...(stepsGoal !== undefined && { stepsGoal }),
    intensity: { minutes, ...(intensityGoal !== undefined && { goal: intensityGoal }), complete },
  }
}
