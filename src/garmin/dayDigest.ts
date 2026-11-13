// Pure view-model of one Garmin day for the Home tiles and the day page. Raw numbers, minutes and tones only:
// the UI formats and translates. No imports from src/ui.
import type { GarminDay, GarminDetail } from '../domain/types'

export type Tone = 'pos' | 'neg' | 'plain'
export type Qualifier = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
export type HrvPosition = 'below' | 'within' | 'above'
export type StressLevel = 'rest' | 'activity' | 'low' | 'medium' | 'high' | 'uncategorized'

type Obj = Record<string, unknown>
const obj = (v: unknown): Obj | undefined => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : undefined)
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined)
const QUALIFIERS: readonly string[] = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR']
const qualifier = (v: unknown): Qualifier | undefined => {
  const s = str(v)
  return s && QUALIFIERS.includes(s) ? (s as Qualifier) : undefined
}

export function qualifierTone(q: Qualifier | undefined): Tone {
  return q === 'EXCELLENT' || q === 'GOOD' ? 'pos' : q === 'POOR' ? 'neg' : 'plain'
}

export interface SleepDigest {
  durationSec: number
  /** Local `HH:MM`. */
  start?: string
  end?: string
  score?: number
  qualifier?: Qualifier
  tone: Tone
  /** Sleep need in minutes. */
  needMin?: number
  /** Stage seconds and share of the stage sum (0..100, rounded). */
  stages: { key: 'deep' | 'light' | 'rem' | 'awake'; seconds: number; pct: number }[]
  chips: { key: 'totalDuration' | 'awakeCount' | 'restlessness' | 'stress'; qualifier: Qualifier; tone: Tone }[]
  avgHr?: number
  respiration?: number
  spo2Avg?: number
  spo2Low?: number
  stress?: number
}

export interface HrvDigest {
  value?: number
  /** Garmin status (BALANCED/UNBALANCED/LOW/POOR) when known. */
  status?: string
  baseline?: { low: number; high: number }
  /** Value vs the baseline corridor; undefined without both. */
  position?: HrvPosition
  tone: Tone
  weeklyAvg?: number
  peak5Min?: number
  /** Scale ends: min/max of the night readings (widened to include value and corridor). */
  scaleMin?: number
  scaleMax?: number
}

export interface RecoveryDigest {
  bbNow?: number
  /** Scale constant of Body Battery. */
  bbMax: 100
  bbCharged?: number
  bbDrained?: number
  /** Curve points `[epoch ms, value]`. */
  bbCurve: [number, number][]
  restingHr?: number
  restingHrWeek?: number
  hrMin?: number
  hrMax?: number
  hrv?: HrvDigest
}

export interface StressDigest {
  avg?: number
  max?: number
  /** Share of the day at rest (0..100, rounded) of all stress durations. */
  restPct?: number
  segments: { level: StressLevel; seconds: number }[]
}

export interface GarminDayDigest {
  day: string
  /** The day is today: values are not final. */
  partial: boolean
  /** Neither the day row nor the detail has anything. */
  empty: boolean
  sleep?: SleepDigest
  steps?: { value: number; goal?: number; distanceM?: number; floorsUp?: number; floorsDown?: number }
  recovery: RecoveryDigest
  stress?: StressDigest
  calories?: { total?: number; active?: number }
  intensity?: { moderate: number; vigorous: number; goal?: number; /** moderate + 2 * vigorous */ dayMinutes: number }
  workouts: { type: string; minutes: number }[]
  respiration?: { avg?: number; min?: number; max?: number }
  spo2?: { avg?: number; low?: number; latest?: number; weekAvg?: number }
}

const HM = /^(\d{1,2}):(\d{2})$/
export function clockMinutes(hhmm: string | undefined): number | undefined {
  const m = hhmm ? HM.exec(hhmm) : null
  return m ? Number(m[1]) * 60 + Number(m[2]) : undefined
}

function localClock(ms: unknown): string | undefined {
  const n = num(ms)
  return n === undefined ? undefined : new Date(n).toISOString().slice(11, 16)
}

function sleepDigest(row: GarminDay | undefined, detail: GarminDetail | undefined): SleepDigest | undefined {
  const s = detail?.sleep
  const start = row?.sleepStart ?? localClock(s?.sleepStartTimestampLocal)
  const end = row?.sleepEnd ?? localClock(s?.sleepEndTimestampLocal)
  let durationSec = num(s?.sleepTimeSeconds)
  if (durationSec === undefined) {
    const a = clockMinutes(start)
    const b = clockMinutes(end)
    if (a !== undefined && b !== undefined) durationSec = (((b - a) % 1440) + 1440) % 1440 * 60
  }
  if (durationSec === undefined || durationSec <= 0) return undefined
  const scores = obj(s?.sleepScores)
  const overall = obj(scores?.overall)
  const q = qualifier(overall?.qualifierKey)
  const stageSecs = [
    ['deep', num(s?.deepSleepSeconds)],
    ['light', num(s?.lightSleepSeconds)],
    ['rem', num(s?.remSleepSeconds)],
    ['awake', num(s?.awakeSleepSeconds)],
  ] as const
  const total = stageSecs.reduce((a, [, v]) => a + (v ?? 0), 0)
  const stages = stageSecs
    .filter((x): x is readonly [(typeof x)[0], number] => x[1] !== undefined && x[1] > 0)
    .map(([key, seconds]) => ({ key, seconds, pct: Math.round((seconds / total) * 100) }))
  const chips: SleepDigest['chips'] = []
  for (const key of ['totalDuration', 'awakeCount', 'restlessness', 'stress'] as const) {
    const cq = qualifier(obj(scores?.[key])?.qualifierKey)
    if (cq) chips.push({ key, qualifier: cq, tone: qualifierTone(cq) })
  }
  const need = num(obj(s?.sleepNeed)?.actual)
  return {
    durationSec,
    ...(start && { start }),
    ...(end && { end }),
    ...(num(overall?.value) !== undefined && { score: num(overall?.value) }),
    ...(q && { qualifier: q }),
    tone: qualifierTone(q),
    ...(need !== undefined && { needMin: need }),
    stages,
    chips,
    ...(num(s?.avgHeartRate) !== undefined && { avgHr: num(s?.avgHeartRate) }),
    ...(num(s?.averageRespirationValue) !== undefined && { respiration: num(s?.averageRespirationValue) }),
    ...(num(s?.averageSpO2Value) !== undefined && { spo2Avg: num(s?.averageSpO2Value) }),
    ...(num(s?.lowestSpO2Value) !== undefined && { spo2Low: num(s?.lowestSpO2Value) }),
    ...(num(s?.avgSleepStress) !== undefined && { stress: num(s?.avgSleepStress) }),
  }
}

function hrvDigest(detail: GarminDetail | undefined): HrvDigest | undefined {
  const sum = obj(detail?.hrv?.hrvSummary)
  const value = num(sum?.lastNightAvg)
  if (!sum || value === undefined) return undefined
  const base = obj(sum.baseline)
  const low = num(base?.balancedLow)
  const high = num(base?.balancedUpper)
  const baseline = low !== undefined && high !== undefined && low <= high ? { low, high } : undefined
  const position: HrvPosition | undefined = baseline
    ? value < baseline.low ? 'below' : value > baseline.high ? 'above' : 'within'
    : undefined
  const readings: number[] = []
  if (Array.isArray(detail?.hrv?.hrvReadings)) {
    for (const r of detail.hrv.hrvReadings) {
      const v = num(obj(r)?.hrvValue)
      if (v !== undefined) readings.push(v)
    }
  }
  const lo = Math.min(value, ...(baseline ? [baseline.low] : []), ...readings)
  const hi = Math.max(value, ...(baseline ? [baseline.high] : []), ...readings)
  return {
    value,
    ...(str(sum.status) && { status: str(sum.status) }),
    ...(baseline && { baseline }),
    ...(position && { position }),
    tone: position === 'within' ? 'pos' : position === 'below' ? 'neg' : 'plain',
    ...(num(sum.weeklyAvg) !== undefined && { weeklyAvg: num(sum.weeklyAvg) }),
    ...(num(sum.lastNight5MinHigh) !== undefined && { peak5Min: num(sum.lastNight5MinHigh) }),
    scaleMin: lo,
    scaleMax: hi,
  }
}

const STRESS_KEYS: [StressLevel, string][] = [
  ['rest', 'restDurationInMillis'],
  ['activity', 'activityDurationInMillis'],
  ['low', 'lowStressDurationInMillis'],
  ['medium', 'mediumStressDurationInMillis'],
  ['high', 'highStressDurationInMillis'],
  ['uncategorized', 'uncategorizedDurationInMillis'],
]

function stressDigest(summary: Obj | undefined): StressDigest | undefined {
  const st = obj(summary?.stress)
  if (!st) return undefined
  const segments: StressDigest['segments'] = []
  for (const [level, key] of STRESS_KEYS) {
    const ms = num(st[key])
    if (ms !== undefined && ms > 0) segments.push({ level, seconds: Math.round(ms / 1000) })
  }
  const total = segments.reduce((a, s) => a + s.seconds, 0)
  const rest = segments.find((s) => s.level === 'rest')?.seconds ?? 0
  const avg = num(st.avgLevel)
  const max = num(st.maxLevel)
  if (avg === undefined && max === undefined && !segments.length) return undefined
  return {
    ...(avg !== undefined && { avg }),
    ...(max !== undefined && { max }),
    ...(total > 0 && { restPct: Math.round((rest / total) * 100) }),
    segments,
  }
}

function pairs(v: unknown): [number, number][] {
  if (!Array.isArray(v)) return []
  const out: [number, number][] = []
  for (const p of v) {
    if (Array.isArray(p)) {
      const t = num(p[0])
      const y = num(p[1])
      if (t !== undefined && y !== undefined) out.push([t, y])
    }
  }
  return out
}

function compact<T extends object>(o: T): T | undefined {
  return Object.values(o).some((v) => v !== undefined) ? o : undefined
}

/** Workouts: the day row (already reduced to type + minutes) or the detail activities as a fallback. */
function workoutsOf(row: GarminDay | undefined, detail: GarminDetail | undefined): { type: string; minutes: number }[] {
  if (row?.activities.length) return row.activities.map((a) => ({ type: a.type, minutes: a.minutes }))
  const out: { type: string; minutes: number }[] = []
  for (const a of detail?.activities ?? []) {
    const type = str(obj(a.activityType)?.typeKey)
    const d = num(a.duration)
    if (type && d !== undefined) out.push({ type, minutes: Math.round(d / 60) })
  }
  return out
}

/** `day`/`today` are `YYYY-MM-DD`. For the Home sleep tile pass today's row (the night ends today). */
export function garminDayDigest(
  day: string,
  today: string,
  row: GarminDay | undefined,
  detail: GarminDetail | undefined,
): GarminDayDigest {
  const summary = detail?.summary
  const mv = obj(summary?.movement)
  const stepsObj = obj(mv?.steps)
  const stepsValue = row?.steps ?? num(stepsObj?.value)
  const bb = obj(summary?.bodyBattery)
  const hrObj = detail?.heartRate
  const sh = obj(summary?.heartRate)
  const cal = obj(summary?.calories)
  const im = obj(summary?.intensityMinutes)
  const resp = obj(summary?.respiration)
  const spo = detail?.spo2
  const ps = obj(summary?.pulseOx)
  const moderate = num(im?.moderate)
  const vigorous = num(im?.vigorous)

  const sleep = sleepDigest(row, detail)
  const steps =
    stepsValue === undefined
      ? undefined
      : {
          value: stepsValue,
          ...(num(stepsObj?.goal) !== undefined && { goal: num(stepsObj?.goal) }),
          ...(num(stepsObj?.distanceInMeters) !== undefined && { distanceM: num(stepsObj?.distanceInMeters) }),
          ...(num(obj(mv?.floorsAscended)?.value) !== undefined && { floorsUp: num(obj(mv?.floorsAscended)?.value) }),
          ...(num(obj(mv?.floorsDescended)?.value) !== undefined && { floorsDown: num(obj(mv?.floorsDescended)?.value) }),
        }
  const recovery: RecoveryDigest = {
    bbNow: num(bb?.latestValue),
    bbMax: 100,
    bbCharged: num(bb?.chargedValue) ?? num(detail?.bodyBattery?.charged),
    bbDrained: num(bb?.drainedValue) ?? num(detail?.bodyBattery?.drained),
    bbCurve: pairs(detail?.bodyBattery?.bodyBatteryValuesArray),
    restingHr: num(hrObj?.restingHeartRate) ?? num(sh?.restingValue),
    restingHrWeek: num(hrObj?.lastSevenDaysAvgRestingHeartRate),
    hrMin: num(hrObj?.minHeartRate) ?? num(sh?.minValue),
    hrMax: num(hrObj?.maxHeartRate) ?? num(sh?.maxValue),
    hrv: hrvDigest(detail),
  }
  const workouts = workoutsOf(row, detail)
  const digest: GarminDayDigest = {
    day,
    partial: day === today,
    empty: false,
    ...(sleep && { sleep }),
    ...(steps && { steps }),
    recovery,
    ...(stressDigest(summary) && { stress: stressDigest(summary) }),
    ...(compact({ total: num(cal?.burnedTotal), active: num(cal?.burnedActive) }) && {
      calories: compact({ total: num(cal?.burnedTotal), active: num(cal?.burnedActive) }),
    }),
    ...((moderate !== undefined || vigorous !== undefined) && {
      intensity: {
        moderate: moderate ?? 0,
        vigorous: vigorous ?? 0,
        ...(num(im?.goal) !== undefined && { goal: num(im?.goal) }),
        dayMinutes: (moderate ?? 0) + 2 * (vigorous ?? 0),
      },
    }),
    workouts,
    ...(compact({ avg: num(resp?.avgValue), min: num(resp?.minValue), max: num(resp?.maxValue) }) && {
      respiration: compact({ avg: num(resp?.avgValue), min: num(resp?.minValue), max: num(resp?.maxValue) }),
    }),
    ...(compact({
      avg: num(spo?.averageSpO2) ?? num(ps?.avgValue),
      low: num(spo?.lowestSpO2) ?? num(ps?.minValue),
      latest: num(spo?.latestSpO2),
      weekAvg: num(spo?.lastSevenDaysAvgSpO2),
    }) && {
      spo2: compact({
        avg: num(spo?.averageSpO2) ?? num(ps?.avgValue),
        low: num(spo?.lowestSpO2) ?? num(ps?.minValue),
        latest: num(spo?.latestSpO2),
        weekAvg: num(spo?.lastSevenDaysAvgSpO2),
      }),
    }),
  }
  digest.empty =
    !sleep &&
    !steps &&
    !workouts.length &&
    !digest.stress &&
    !digest.calories &&
    !digest.intensity &&
    !digest.respiration &&
    !digest.spo2 &&
    Object.entries(recovery).every(([k, v]) => k === 'bbMax' || v === undefined || (Array.isArray(v) && !v.length))
  return digest
}
