import type { GarminDay, GarminDetail } from '../domain/types'
import { NAMED_ACTIVITY_TYPES, humanizeType } from './ui'

/** Units of an item value. `sec` is rendered with `formatDuration`, `m` with `formatDistance`; the rest have an i18n label. */
export type DetailUnit =
  | 'steps'
  | 'm'
  | 'kcal'
  | 'bpm'
  | 'ms'
  | 'min'
  | 'sec'
  | '%'
  | 'brpm'
  | 'floors'
  | 'ml'

export interface DetailItem {
  /** i18n key of the label (`garmin.day.i.*`). */
  key: string
  /** Raw value (seconds, metres, ...) or text. */
  value: number | string
  unit?: DetailUnit
  /** When set, `value` is an enum text and this i18n key is its translation. */
  valueKey?: string
  /** Qualifier (EXCELLENT/GOOD/...) shown next to a numeric value; i18n key. */
  qualifierKey?: string
}

export type DetailChart =
  | {
      kind: 'line'
      id: string
      titleKey: string
      unit?: DetailUnit
      /** `t` is epoch ms. */
      points: { t: number; v: number }[]
      band?: { low: number; high: number }
    }
  | {
      kind: 'stacked'
      id: string
      titleKey: string
      unit: 'sec'
      /** `key` is an i18n key (stage/level/zone name). */
      segments: { key: string; value: number }[]
    }
  | { kind: 'bars'; id: string; titleKey: string; unit?: DetailUnit; bars: { label: string; v: number }[] }

/** A sub-block of a section: one activity or one body battery event. Has `titleKey` (i18n) or a plain `title`. */
export interface DetailGroup {
  titleKey?: string
  title?: string
  items: DetailItem[]
  charts?: DetailChart[]
}

export type SectionId =
  | 'activity'
  | 'heartRate'
  | 'hrv'
  | 'stress'
  | 'bodyBattery'
  | 'sleep'
  | 'respiration'
  | 'activities'
  | 'other'

export interface DetailSection {
  id: SectionId
  items: DetailItem[]
  charts?: DetailChart[]
  groups?: DetailGroup[]
}

export interface DayDetailView {
  sections: DetailSection[]
  /** No stored detail: only the plan-13 summary row is shown. */
  summaryOnly: boolean
}

export const SLEEP_QUALIFIERS = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'] as const
export const HRV_STATUSES = ['BALANCED', 'UNBALANCED', 'LOW', 'POOR'] as const
export const STRESS_QUALIFIERS = ['calm', 'balanced', 'stressful', 'very_stressful', 'unknown'] as const
export const BB_EVENT_TYPES = ['ACTIVITY', 'RECOVERY'] as const
export const SLEEP_SCORE_KEYS = [
  'totalDuration',
  'stress',
  'awakeCount',
  'restlessness',
  'remPercentage',
  'lightPercentage',
  'deepPercentage',
] as const

type Obj = Record<string, unknown>

function obj(v: unknown): Obj | undefined {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : undefined
}
function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}
function str(v: unknown): string | undefined {
  return typeof v === 'string' && v ? v : undefined
}
function isIn(list: readonly string[], v: string | undefined): v is string {
  return v !== undefined && list.includes(v)
}

function add(items: DetailItem[], key: string, value: number | string | undefined, unit?: DetailUnit): void {
  if (value === undefined) return
  items.push({ key: `garmin.day.i.${key}`, value, ...(unit && { unit }) })
}

function addEnum(items: DetailItem[], key: string, raw: string | undefined, known: readonly string[], prefix: string): void {
  if (!raw) return
  const item: DetailItem = { key: `garmin.day.i.${key}`, value: raw }
  if (isIn(known, raw)) item.valueKey = `garmin.day.${prefix}.${raw}`
  items.push(item)
}

/** `2026-11-12T14:19:37.0` / `2026-11-12 14:19:37` -> `14:19`. */
function clock(s: unknown): string | undefined {
  const v = str(s)
  return v && v.length >= 16 ? v.slice(11, 16) : undefined
}
/** Epoch ms of a watch-LOCAL timestamp (shifted so that UTC fields equal local fields) -> `HH:MM`. */
function clockFromLocalMs(ms: unknown): string | undefined {
  const n = num(ms)
  return n === undefined ? undefined : new Date(n).toISOString().slice(11, 16)
}
function sec(ms: unknown): number | undefined {
  const n = num(ms)
  return n === undefined ? undefined : Math.round(n / 1000)
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

function section(id: SectionId, items: DetailItem[], charts: DetailChart[] = [], groups: DetailGroup[] = []): DetailSection | undefined {
  if (!items.length && !charts.length && !groups.length) return undefined
  return { id, items, ...(charts.length && { charts }), ...(groups.length && { groups }) }
}

function activitySection(summary: Obj | undefined): DetailSection | undefined {
  const mv = obj(summary?.movement)
  const steps = obj(mv?.steps)
  const up = obj(mv?.floorsAscended)
  const down = obj(mv?.floorsDescended)
  const cal = obj(summary?.calories)
  const im = obj(summary?.intensityMinutes)
  const items: DetailItem[] = []
  add(items, 'steps', num(steps?.value), 'steps')
  add(items, 'stepGoal', num(steps?.goal), 'steps')
  add(items, 'distance', num(steps?.distanceInMeters), 'm')
  add(items, 'floorsUp', num(up?.value), 'floors')
  add(items, 'floorsDown', num(down?.value), 'floors')
  add(items, 'caloriesResting', num(cal?.burnedResting), 'kcal')
  add(items, 'caloriesActive', num(cal?.burnedActive), 'kcal')
  add(items, 'caloriesTotal', num(cal?.burnedTotal), 'kcal')
  add(items, 'intensityModerate', num(im?.moderate), 'min')
  add(items, 'intensityVigorous', num(im?.vigorous), 'min')
  add(items, 'intensityGoal', num(im?.goal), 'min')
  return section('activity', items)
}

function heartRateSection(detail: GarminDetail): DetailSection | undefined {
  const hr = detail.heartRate
  const sh = obj(detail.summary?.heartRate)
  const items: DetailItem[] = []
  add(items, 'hrResting', num(hr?.restingHeartRate) ?? num(sh?.restingValue), 'bpm')
  add(items, 'hrMin', num(hr?.minHeartRate) ?? num(sh?.minValue), 'bpm')
  add(items, 'hrMax', num(hr?.maxHeartRate) ?? num(sh?.maxValue), 'bpm')
  add(items, 'hrRestingWeek', num(hr?.lastSevenDaysAvgRestingHeartRate), 'bpm')
  const points = pairs(hr?.heartRateValues).map(([t, v]) => ({ t, v }))
  const charts: DetailChart[] = points.length >= 2 ? [{ kind: 'line', id: 'hrCurve', titleKey: 'garmin.day.chart.hrCurve', unit: 'bpm', points }] : []
  return section('heartRate', items, charts)
}

function hrvSection(detail: GarminDetail): DetailSection | undefined {
  const hrv = detail.hrv
  const sum = obj(hrv?.hrvSummary)
  const base = obj(sum?.baseline)
  const items: DetailItem[] = []
  add(items, 'hrvLastNight', num(sum?.lastNightAvg), 'ms')
  add(items, 'hrvWeekly', num(sum?.weeklyAvg), 'ms')
  add(items, 'hrv5MinHigh', num(sum?.lastNight5MinHigh), 'ms')
  addEnum(items, 'hrvStatus', str(sum?.status), HRV_STATUSES, 'hrvStatus')
  const low = num(base?.balancedLow)
  const high = num(base?.balancedUpper)
  add(items, 'hrvBaselineLow', low, 'ms')
  add(items, 'hrvBaselineHigh', high, 'ms')
  const points: { t: number; v: number }[] = []
  if (Array.isArray(hrv?.hrvReadings)) {
    for (const r of hrv.hrvReadings) {
      const o = obj(r)
      const v = num(o?.hrvValue)
      const gmt = str(o?.readingTimeGMT)
      const t = gmt ? Date.parse(`${gmt.replace(' ', 'T')}Z`) : NaN
      if (v !== undefined && Number.isFinite(t)) points.push({ t, v })
    }
  }
  const charts: DetailChart[] =
    points.length >= 2
      ? [
          {
            kind: 'line',
            id: 'hrvNight',
            titleKey: 'garmin.day.chart.hrvNight',
            unit: 'ms',
            points,
            ...(low !== undefined && high !== undefined && { band: { low, high } }),
          },
        ]
      : []
  return section('hrv', items, charts)
}

const STRESS_LEVELS = ['rest', 'activity', 'low', 'medium', 'high', 'uncategorized'] as const
const STRESS_DURATION_KEY: Record<(typeof STRESS_LEVELS)[number], string> = {
  rest: 'restDurationInMillis',
  activity: 'activityDurationInMillis',
  low: 'lowStressDurationInMillis',
  medium: 'mediumStressDurationInMillis',
  high: 'highStressDurationInMillis',
  uncategorized: 'uncategorizedDurationInMillis',
}

function stressSection(summary: Obj | undefined): DetailSection | undefined {
  const st = obj(summary?.stress)
  const items: DetailItem[] = []
  add(items, 'stressAvg', num(st?.avgLevel))
  add(items, 'stressMax', num(st?.maxLevel))
  addEnum(items, 'stressQualifier', str(st?.qualifier), STRESS_QUALIFIERS, 'stressQualifier')
  const segments: { key: string; value: number }[] = []
  for (const lvl of STRESS_LEVELS) {
    const s = sec(st?.[STRESS_DURATION_KEY[lvl]])
    if (s !== undefined && s > 0) segments.push({ key: `garmin.day.stressLevel.${lvl}`, value: s })
  }
  const charts: DetailChart[] = segments.length
    ? [{ kind: 'stacked', id: 'stressDurations', titleKey: 'garmin.day.chart.stress', unit: 'sec', segments }]
    : []
  return section('stress', items, charts)
}

function bodyBatterySection(detail: GarminDetail): DetailSection | undefined {
  const sb = obj(detail.summary?.bodyBattery)
  const bb = detail.bodyBattery
  const items: DetailItem[] = []
  add(items, 'bbMin', num(sb?.minValue))
  add(items, 'bbMax', num(sb?.maxValue))
  add(items, 'bbCharged', num(sb?.chargedValue) ?? num(bb?.charged))
  add(items, 'bbDrained', num(sb?.drainedValue) ?? num(bb?.drained))
  add(items, 'bbLatest', num(sb?.latestValue))

  const groups: DetailGroup[] = []
  const events = Array.isArray(sb?.activityEvents)
    ? sb.activityEvents
    : Array.isArray(bb?.bodyBatteryActivityEvent)
      ? bb.bodyBatteryActivityEvent
      : []
  for (const e of events) {
    const o = obj(e)
    if (!o) continue
    const type = str(o.eventType)
    // Sleep is its own section; a SLEEP group here would duplicate it.
    if (type === 'SLEEP') continue
    const gi: DetailItem[] = []
    add(gi, 'bbEventStart', clock(o.eventStartTimeLocal) ?? clock(o.eventStartTimeGmt))
    add(gi, 'bbEventDuration', sec(o.durationInMillis ?? o.durationInMilliseconds), 'sec')
    add(gi, 'bbEventImpact', num(o.bodyBatteryImpact))
    if (!type && !gi.length) continue
    groups.push({
      ...(isIn(BB_EVENT_TYPES, type) ? { titleKey: `garmin.day.bbEvent.${type}` } : { title: humanizeType((type ?? '').toLowerCase()) }),
      items: gi,
    })
  }
  const points = pairs(bb?.bodyBatteryValuesArray).map(([t, v]) => ({ t, v }))
  const charts: DetailChart[] =
    points.length >= 2 ? [{ kind: 'line', id: 'bbCurve', titleKey: 'garmin.day.chart.bodyBattery', points }] : []
  return section('bodyBattery', items, charts, groups)
}

function sleepSection(sleep: Obj | undefined): DetailSection | undefined {
  if (!sleep) return undefined
  const items: DetailItem[] = []
  add(items, 'sleepDuration', num(sleep.sleepTimeSeconds), 'sec')
  add(items, 'sleepStart', clockFromLocalMs(sleep.sleepStartTimestampLocal))
  add(items, 'sleepEnd', clockFromLocalMs(sleep.sleepEndTimestampLocal))
  const scores = obj(sleep.sleepScores)
  const overall = obj(scores?.overall)
  const overallValue = num(overall?.value)
  if (overallValue !== undefined) {
    const q = str(overall?.qualifierKey)
    items.push({
      key: 'garmin.day.i.sleepScore',
      value: overallValue,
      ...(isIn(SLEEP_QUALIFIERS, q) && { qualifierKey: `garmin.day.q.${q}` }),
    })
  }
  for (const k of SLEEP_SCORE_KEYS) {
    const sub = obj(scores?.[k])
    if (!sub) continue
    const q = str(sub.qualifierKey)
    const v = num(sub.value)
    const known = isIn(SLEEP_QUALIFIERS, q)
    if (v !== undefined) {
      items.push({
        key: `garmin.day.i.sleepScore.${k}`,
        value: v,
        ...(k.endsWith('Percentage') && { unit: '%' as const }),
        ...(known && { qualifierKey: `garmin.day.q.${q}` }),
      })
    } else if (q) {
      items.push({ key: `garmin.day.i.sleepScore.${k}`, value: q, ...(known && { valueKey: `garmin.day.q.${q}` }) })
    }
  }
  add(items, 'sleepAvgHr', num(sleep.avgHeartRate), 'bpm')
  add(items, 'sleepAvgStress', num(sleep.avgSleepStress))
  add(items, 'sleepAvgSpo2', num(sleep.averageSpO2Value), '%')
  add(items, 'sleepLowSpo2', num(sleep.lowestSpO2Value), '%')
  add(items, 'sleepAvgResp', num(sleep.averageRespirationValue), 'brpm')
  add(items, 'sleepAwakeCount', num(sleep.awakeCount))
  add(items, 'sleepNeed', num(obj(sleep.sleepNeed)?.actual), 'min')
  const nap = num(sleep.napTimeSeconds)
  add(items, 'sleepNaps', nap !== undefined && nap > 0 ? nap : undefined, 'sec')

  const stages: [string, unknown][] = [
    ['deep', sleep.deepSleepSeconds],
    ['light', sleep.lightSleepSeconds],
    ['rem', sleep.remSleepSeconds],
    ['awake', sleep.awakeSleepSeconds],
  ]
  const segments = stages.flatMap(([k, v]) => {
    const n = num(v)
    return n !== undefined && n > 0 ? [{ key: `garmin.day.sleepStage.${k}`, value: n }] : []
  })
  const charts: DetailChart[] = segments.length
    ? [{ kind: 'stacked', id: 'sleepStages', titleKey: 'garmin.day.chart.sleepStages', unit: 'sec', segments }]
    : []
  return section('sleep', items, charts)
}

function respirationSection(detail: GarminDetail): DetailSection | undefined {
  const resp = obj(detail.summary?.respiration)
  const pulse = obj(detail.summary?.pulseOx)
  const sp = detail.spo2
  const items: DetailItem[] = []
  add(items, 'respAvg', num(resp?.avgValue), 'brpm')
  add(items, 'respMin', num(resp?.minValue), 'brpm')
  add(items, 'respMax', num(resp?.maxValue), 'brpm')
  add(items, 'spo2Avg', num(sp?.averageSpO2) ?? num(pulse?.avgValue), '%')
  add(items, 'spo2Min', num(sp?.lowestSpO2) ?? num(pulse?.minValue), '%')
  add(items, 'spo2Latest', num(sp?.latestSpO2) ?? num(pulse?.latestValue), '%')
  add(items, 'spo2Week', num(sp?.lastSevenDaysAvgSpO2) !== undefined ? Math.round(num(sp?.lastSevenDaysAvgSpO2)! * 10) / 10 : undefined, '%')
  add(items, 'spo2Sleep', num(sp?.avgSleepSpO2), '%')

  // Hourly timestamps are real epochs; the label uses the watch's local offset (local start - GMT start).
  const gmt = str(sp?.startTimestampGMT)
  const local = str(sp?.startTimestampLocal)
  const offset =
    gmt && local ? Date.parse(`${local.replace(' ', 'T')}Z`) - Date.parse(`${gmt.replace(' ', 'T')}Z`) : 0
  const bars = pairs(sp?.spO2HourlyAverages).map(([t, v]) => ({
    label: new Date(t + (Number.isFinite(offset) ? offset : 0)).toISOString().slice(11, 13),
    v,
  }))
  const charts: DetailChart[] = bars.length ? [{ kind: 'bars', id: 'spo2Hourly', titleKey: 'garmin.day.chart.spo2', unit: '%', bars }] : []
  return section('respiration', items, charts)
}

function activitiesSection(list: Obj[] | undefined): DetailSection | undefined {
  if (!list?.length) return undefined
  const groups: DetailGroup[] = []
  for (const a of list) {
    const typeKey = str(obj(a.activityType)?.typeKey)
    const items: DetailItem[] = []
    add(items, 'actDuration', num(a.duration), 'sec')
    const dist = num(a.distance)
    add(items, 'actDistance', dist !== undefined && dist > 0 ? dist : undefined, 'm')
    add(items, 'actCalories', num(a.calories), 'kcal')
    add(items, 'actAvgHr', num(a.averageHR), 'bpm')
    add(items, 'actMaxHr', num(a.maxHR), 'bpm')
    add(items, 'actAerobicTe', roundTo(num(a.aerobicTrainingEffect), 1))
    add(items, 'actAnaerobicTe', roundTo(num(a.anaerobicTrainingEffect), 1))
    add(items, 'actLoad', roundTo(num(a.activityTrainingLoad), 1))
    add(items, 'actBodyBattery', num(a.differenceBodyBattery))
    add(items, 'actSteps', num(a.steps), 'steps')
    add(items, 'actWater', num(a.waterEstimated), 'ml')
    const sets = num(a.totalSets)
    if (sets !== undefined && sets > 0) {
      add(items, 'actSets', sets)
      add(items, 'actReps', num(a.totalReps))
      const exercises = Array.isArray(a.summarizedExerciseSets) ? a.summarizedExerciseSets.map(obj) : []
      const volume = exercises.reduce((s, e) => s + (num(e?.volume) ?? 0), 0)
      const maxWeight = exercises.reduce((m, e) => Math.max(m, num(e?.maxWeight) ?? 0), 0)
      add(items, 'actVolume', volume > 0 ? volume : undefined)
      add(items, 'actMaxWeight', maxWeight > 0 ? maxWeight : undefined)
    }
    const zones: { key: string; value: number }[] = []
    for (let z = 1; z <= 5; z++) {
      const s = num(a[`hrTimeInZone_${z}`])
      if (s !== undefined && s > 0) zones.push({ key: `garmin.day.zone.${z}`, value: Math.round(s) })
    }
    const charts: DetailChart[] = zones.length
      ? [{ kind: 'stacked', id: 'hrZones', titleKey: 'garmin.day.chart.hrZones', unit: 'sec', segments: zones }]
      : []
    groups.push({
      ...(typeKey && (NAMED_ACTIVITY_TYPES as readonly string[]).includes(typeKey)
        ? { titleKey: `garmin.type.${typeKey}` }
        : { title: humanizeType(typeKey ?? 'activity') }),
      items,
      ...(charts.length && { charts }),
    })
  }
  return section('activities', [], [], groups)
}

function roundTo(n: number | undefined, digits: number): number | undefined {
  if (n === undefined) return undefined
  const f = 10 ** digits
  return Math.round(n * f) / f
}

function otherSection(summary: Obj | undefined): DetailSection | undefined {
  const h = obj(summary?.hydration)
  const items: DetailItem[] = []
  const consumed = num(h?.consumedInMl)
  if (consumed !== undefined && consumed > 0) {
    add(items, 'water', consumed, 'ml')
    add(items, 'waterGoal', num(h?.goalInMl), 'ml')
  }
  add(items, 'fitnessAge', num(obj(summary?.fitnessAge)?.fitnessAge ?? summary?.fitnessAge))
  return section('other', items)
}

function summaryOnlyView(row: GarminDay): DayDetailView {
  const sections: DetailSection[] = []
  const steps: DetailItem[] = []
  add(steps, 'steps', row.steps, 'steps')
  const a = section('activity', steps)
  if (a) sections.push(a)
  const sleepItems: DetailItem[] = []
  add(sleepItems, 'sleepStart', row.sleepStart)
  add(sleepItems, 'sleepEnd', row.sleepEnd)
  const s = section('sleep', sleepItems)
  if (s) sections.push(s)
  const groups: DetailGroup[] = (row.activities ?? []).map((act) => {
    const items: DetailItem[] = []
    add(items, 'actDuration', act.minutes, 'min')
    return {
      ...((NAMED_ACTIVITY_TYPES as readonly string[]).includes(act.type)
        ? { titleKey: `garmin.type.${act.type}` }
        : { title: humanizeType(act.type) }),
      items,
    }
  })
  const acts = section('activities', [], [], groups)
  if (acts) sections.push(acts)
  return { sections, summaryOnly: true }
}

/**
 * View-model of the Garmin day page. Pure; values stay raw (seconds, metres), formatting is the UI's job.
 * No stored detail -> the plan-13 `row` items and `summaryOnly: true`.
 */
export function garminDayDetailView(detail: GarminDetail | undefined, row?: GarminDay): DayDetailView {
  if (!detail || Object.keys(detail).length === 0) return row ? summaryOnlyView(row) : { sections: [], summaryOnly: true }
  const all = [
    activitySection(detail.summary),
    heartRateSection(detail),
    hrvSection(detail),
    stressSection(detail.summary),
    bodyBatterySection(detail),
    sleepSection(detail.sleep),
    respirationSection(detail),
    activitiesSection(detail.activities),
    otherSection(detail.summary),
  ]
  return { sections: all.filter((s): s is DetailSection => s !== undefined), summaryOnly: false }
}

export { formatDistance, formatDuration } from '../ui/format'

/**
 * Watch UTC offset in ms (local start - GMT start of any stored block), 0 when unknown. Chart ticks must show
 * the watch's clock, not the viewer's: format `t + offset` with UTC getters.
 */
export function watchOffsetMs(detail: GarminDetail | undefined): number {
  for (const block of [detail?.heartRate, detail?.spo2, detail?.bodyBattery, detail?.hrv]) {
    const gmt = str(block?.startTimestampGMT)
    const local = str(block?.startTimestampLocal)
    if (!gmt || !local) continue
    const d = Date.parse(`${local.replace(' ', 'T')}Z`) - Date.parse(`${gmt.replace(' ', 'T')}Z`)
    if (Number.isFinite(d)) return d
  }
  return 0
}

export interface TreeRow {
  path: string
  value: string | number | boolean
}

function isPrimitive(v: unknown): v is string | number | boolean | null {
  return v === null || ['string', 'number', 'boolean'].includes(typeof v)
}
/** Object arrays at least this long (e.g. `hrvReadings`) are treated as series; short ones (events, sets) stay indexed. */
const SERIES_OBJECT_MIN = 20
const MAX_DEPTH = 12
/** A series: numbers, arrays of primitives (`[[epoch, bpm], ...]`), or long arrays of flat primitive records. */
function isSeries(arr: unknown[]): boolean {
  return arr.every(
    (x) =>
      typeof x === 'number' ||
      (Array.isArray(x) && x.every(isPrimitive)) ||
      (arr.length >= SERIES_OBJECT_MIN && !!obj(x) && Object.values(x as Obj).every(isPrimitive)),
  )
}

/**
 * Whole detail as sorted `{ path, value }` rows for the «Все поля» tree. Nulls and empty containers are skipped;
 * series (see `isSeries`) become `pointsLabel(n)`; other arrays of objects are indexed (`activities[0].calories`).
 * Nesting deeper than 12 levels is dropped.
 */
export function flattenForTree(
  detail: GarminDetail | undefined,
  pointsLabel: (n: number) => string = (n) => `${n} точек`,
): TreeRow[] {
  const rows: TreeRow[] = []
  const walk = (v: unknown, path: string, depth: number): void => {
    if (v === null || v === undefined || depth > MAX_DEPTH) return
    if (isPrimitive(v)) {
      rows.push({ path, value: v })
    } else if (Array.isArray(v)) {
      if (v.length === 0) return
      if (isSeries(v)) rows.push({ path, value: pointsLabel(v.length) })
      else v.forEach((x, i) => walk(x, `${path}[${i}]`, depth + 1))
    } else if (typeof v === 'object') {
      for (const [k, x] of Object.entries(v as Obj)) walk(x, path ? `${path}.${k}` : k, depth + 1)
    }
  }
  walk(detail, '', 0)
  return rows.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
}
