import type { GarminDetail } from '../domain/types'

/**
 * Raw Garmin Personal API responses for ONE date (see docs/specs/13-garmin.md «All endpoints»).
 * Every part may be missing/null/empty (204). Pure: no Deno/Node imports (reused by the Edge Function).
 */
export interface GarminDetailRaw {
  /** `usersummary-service/v2/dailysummaries` response (`{ data: [...] }` or the array); the entry for `day` is used. */
  summaries?: unknown
  /** `dailySleep?date=day` response (the night ending on `day`). */
  sleep?: unknown
  /** `dailyHeartRate?date=day`. */
  heartRate?: unknown
  /** `hrv/{day}`. */
  hrv?: unknown
  /** `spo2acclimation/{day}`. */
  spo2?: unknown
  /** `bodyBattery/reports/daily` response (array per day); the entry dated `day` is used. */
  bodyBattery?: unknown
  /** `activities/search` list; only activities with `startTimeLocal` on `day` are kept. */
  activities?: unknown
}

/** Keys that identify a person/device or hold names, avatars, locations (spec «Privacy: strip these fields»). */
export const STRIP_KEYS: ReadonlySet<string> = new Set([
  'userProfilePk',
  'userProfilePK',
  'userProfileId',
  'uuid',
  'activityUUID',
  'ownerId',
  'ownerDisplayName',
  'ownerFullName',
  'userInfoDto',
  'displayName',
  'deviceId',
  'activityName', // free text, may hold a name
  'id', // sleep record id
])

/**
 * Also stripped: any key matching this. Deliberately NOT a bare /lat|lon/ (that would drop `latestSpO2`, `duration`-like
 * keys): coordinates are matched as latitude/longitude, an exact lat/lon/lng, or a camelCase `...Lat/Lon/Lng` suffix.
 */
export const STRIP_KEY_RE =
  /latitude|longitude|polyline|owner|profileImage|displayName|fullName|uuid|userProfile|deviceId|^(lat|lon|lng)$|[a-z](Lat|Lon|Lng)$/i

export function isPrivateKey(key: string): boolean {
  return STRIP_KEYS.has(key) || STRIP_KEY_RE.test(key)
}

/** Deep copy without identifier/name/location keys (arrays and nested objects included). */
export function stripPrivate<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => stripPrivate(v)) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (!isPrivateKey(k)) out[k] = stripPrivate(v)
    }
    return out as T
  }
  return value
}

type Obj = Record<string, unknown>

function obj(v: unknown): Obj | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : null
}

function nonEmpty(v: unknown): Obj | undefined {
  const o = obj(v)
  return o && Object.keys(o).length > 0 ? stripPrivate(o) : undefined
}

function entryFor(list: unknown, key: string, day: string): Obj | undefined {
  const arr = Array.isArray(list) ? list : obj(list)?.data
  if (!Array.isArray(arr)) return undefined
  for (const item of arr) {
    const o = obj(item)
    const d = o?.[key]
    if (o && typeof d === 'string' && d.slice(0, 10) === day) return nonEmpty(o)
  }
  return undefined
}

/** Raw responses for one `day` (YYYY-MM-DD) -> sanitized `GarminDetail`. Missing parts stay absent. */
export function buildDetail(raw: GarminDetailRaw | null | undefined, day: string): GarminDetail {
  const out: GarminDetail = {}
  const summary = entryFor(raw?.summaries, 'calendarDate', day)
  if (summary) out.summary = summary

  // Plan 13 attributes sleep to the date it ends on: the response fetched for `day` (its calendarDate is `day`).
  const sleep = obj(raw?.sleep)
  const sleepDate = sleep?.calendarDate
  if (sleep && (typeof sleepDate !== 'string' || sleepDate.slice(0, 10) === day)) {
    const s = nonEmpty(sleep)
    if (s) out.sleep = s
  }

  const hr = obj(raw?.heartRate)
  const hrDate = hr?.calendarDate
  if (hr && (typeof hrDate !== 'string' || hrDate.slice(0, 10) === day)) {
    const h = nonEmpty(hr)
    if (h) out.heartRate = h
  }

  const hrv = nonEmpty(raw?.hrv)
  if (hrv) out.hrv = hrv
  const spo2 = nonEmpty(raw?.spo2)
  if (spo2) out.spo2 = spo2
  const bb = entryFor(raw?.bodyBattery, 'date', day)
  if (bb) out.bodyBattery = bb

  if (Array.isArray(raw?.activities)) {
    const acts: Obj[] = []
    for (const item of raw.activities) {
      const o = obj(item)
      const start = o?.startTimeLocal
      if (o && typeof start === 'string' && start.slice(0, 10) === day) acts.push(stripPrivate(o))
    }
    if (acts.length) out.activities = acts
  }
  return out
}

/**
 * Tracks which days had an optional detail call that ERRORED (as opposed to returning no data).
 * `fail(day)` marks one day; `fail(null)` (a range call) marks every day. Such days must not overwrite stored detail.
 */
export function createFailureTracker(): { fail: (day: string | null) => void; isFailed: (day: string) => boolean } {
  const days = new Set<string>()
  let all = false
  return {
    fail: (day) => {
      if (day === null) all = true
      else days.add(day)
    },
    isFailed: (day) => all || days.has(day),
  }
}
