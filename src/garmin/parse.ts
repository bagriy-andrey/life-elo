import type { GarminDay } from '../domain/types'

/** Raw Garmin Personal API responses for a date range (see docs/specs/13-garmin.md). Pure: no Deno/Node imports. */
export interface GarminRaw {
  steps?: unknown
  /** date -> dailySleep response (or null/empty). */
  sleepByDate?: Record<string, unknown> | null
  activities?: unknown
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}/

function obj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

function hhmm(localMs: unknown): string | undefined {
  const n = num(localMs)
  if (n === undefined) return undefined
  const d = new Date(n)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

/** Garmin responses -> GarminDay per calendar date. Only days with some data are returned. */
export function parseGarmin(raw: GarminRaw | null | undefined): Record<string, GarminDay> {
  const out: Record<string, GarminDay> = {}
  const day = (k: string): GarminDay => (out[k] ??= { activities: [] })

  if (Array.isArray(raw?.steps)) {
    for (const item of raw.steps) {
      const o = obj(item)
      const date = typeof o?.calendarDate === 'string' ? o.calendarDate : null
      const steps = num(o?.totalSteps)
      if (date && DAY_RE.test(date) && steps !== undefined) day(date.slice(0, 10)).steps = steps
    }
  }

  const sleep = obj(raw?.sleepByDate)
  if (sleep) {
    for (const [key, v] of Object.entries(sleep)) {
      const o = obj(v)
      if (!o) continue
      const date = typeof o.calendarDate === 'string' ? o.calendarDate : key
      if (!DAY_RE.test(date)) continue
      const start = hhmm(o.sleepStartTimestampLocal)
      const end = hhmm(o.sleepEndTimestampLocal)
      if (start === undefined && end === undefined) continue
      const d = day(date.slice(0, 10))
      if (start !== undefined) d.sleepStart = start
      if (end !== undefined) d.sleepEnd = end
    }
  }

  if (Array.isArray(raw?.activities)) {
    for (const item of raw.activities) {
      const o = obj(item)
      const start = typeof o?.startTimeLocal === 'string' ? o.startTimeLocal : ''
      const type = obj(o?.activityType)?.typeKey
      const secs = num(o?.duration)
      if (!DAY_RE.test(start) || typeof type !== 'string' || !type || secs === undefined) continue
      day(start.slice(0, 10)).activities.push({ type, minutes: Math.round(secs / 60) })
    }
  }
  return out
}

/**
 * ISO time of the watch's latest uploaded data: `endTimestampGmt` (no `Z` in the API) of the latest calendarDate in a
 * `usersummary-service/v2/dailysummaries` response (`{ data: [...] }`). Undefined when missing/garbage.
 * See docs/specs/13-garmin.md «Last sync / data completeness».
 */
export function deviceLastSyncAt(response: unknown): string | undefined {
  const list = Array.isArray(response) ? response : obj(response)?.data
  if (!Array.isArray(list)) return undefined
  let bestDate = ''
  let best: string | undefined
  for (const item of list) {
    const o = obj(item)
    const date = typeof o?.calendarDate === 'string' ? o.calendarDate : ''
    const end = obj(o?.wellnessChronology)?.endTimestampGmt
    if (!DAY_RE.test(date) || typeof end !== 'string') continue
    const ms = Date.parse(`${end}Z`)
    if (Number.isNaN(ms) || date < bestDate) continue
    bestDate = date
    best = new Date(ms).toISOString()
  }
  return best
}

export interface DayCoverage {
  steps: boolean
  sleep: boolean
  activities: number
}

/** Per-day data presence for every day in [from..to] (inclusive, YYYY-MM-DD). */
export function coverage(
  days: Record<string, GarminDay>,
  from: string,
  to: string,
): Record<string, DayCoverage> {
  const out: Record<string, DayCoverage> = {}
  const end = Date.parse(`${to}T00:00:00Z`)
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= end; t += 86400000) {
    const key = new Date(t).toISOString().slice(0, 10)
    const d = days[key]
    out[key] = {
      steps: d?.steps !== undefined,
      sleep: d?.sleepStart !== undefined || d?.sleepEnd !== undefined,
      activities: d?.activities.length ?? 0,
    }
  }
  return out
}
