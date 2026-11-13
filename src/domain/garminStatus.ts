import type { DayCoverage } from '../garmin/parse'
import type { PullResult } from '../garmin/api'
import type { DayKey, GarminDay } from './types'

export type GarminReviewReason = 'token' | 'garmin' | 'db' | 'unknown' | 'timeout' | 'offline'

export type GarminReviewStatus =
  | { state: 'loading' | 'complete' | 'partial' | 'no_data' | 'key_invalid' | 'hidden' }
  | { state: 'error'; reason: GarminReviewReason }

type Presence = { any: boolean; sleep: boolean }

function presence(day: DayKey, coverage: Record<string, DayCoverage> | undefined, rows: Record<DayKey, GarminDay>): Presence {
  const c = coverage?.[day]
  const r = rows[day]
  const fromRow = {
    any: !!r && (r.steps !== undefined || r.sleepStart !== undefined || r.sleepEnd !== undefined || r.activities.length > 0),
    sleep: !!r && (r.sleepStart !== undefined || r.sleepEnd !== undefined),
  }
  if (!c) return fromRow
  return {
    any: c.steps || c.sleep || c.activities > 0 || fromRow.any,
    sleep: c.sleep || fromRow.sleep,
  }
}

/** Local midnight that starts the calendar day `key`. */
function startOfDay(key: DayKey): number {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

/**
 * Morning-review Garmin state for `day` (yesterday) on `today`. `pull` is the result of the latest pull
 * (undefined while it runs). "Complete" = the watch has data past the end of `day` (device last sync after
 * the start of `today`, or - when the API gave no timestamp - today's sleep exists) and `day` has data.
 */
export function reviewGarminStatus(input: {
  pull: PullResult | undefined
  day: DayKey
  today: DayKey
  rows: Record<DayKey, GarminDay>
}): GarminReviewStatus {
  const { pull, day, today, rows } = input
  if (!pull) return { state: 'loading' }
  switch (pull.kind) {
    case 'not_connected':
      return { state: 'hidden' }
    case 'key_invalid':
      return { state: 'key_invalid' }
    case 'error':
      return { state: 'error', reason: pull.stage }
    case 'timeout':
    case 'offline':
      return { state: 'error', reason: pull.kind }
  }
  const coverage = pull.kind === 'ok' ? pull.coverage : undefined
  const deviceLastSyncAt = pull.kind === 'ok' ? pull.deviceLastSyncAt : undefined
  const dayData = presence(day, coverage, rows)
  if (!dayData.any) return { state: 'no_data' }
  const synced =
    deviceLastSyncAt !== undefined && !Number.isNaN(Date.parse(deviceLastSyncAt))
      ? Date.parse(deviceLastSyncAt) > startOfDay(today)
      : presence(today, coverage, rows).sleep
  return { state: synced ? 'complete' : 'partial' }
}
