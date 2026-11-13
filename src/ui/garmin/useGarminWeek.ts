import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addDays, weekStart } from '../../domain/day'
import { db } from '../../db/db'
import type { DayKey, GarminDay, GarminDetail } from '../../domain/types'
import { pull as apiPull, type PullResult } from '../../garmin/api'
import { loadStatusCache, saveStatusCache, type GarminStatusCache } from '../../garmin/statusCache'

export interface WeekData {
  rows: Record<DayKey, GarminDay | undefined>
  details: Record<DayKey, GarminDetail | undefined>
}

/** Monday..Sunday keys of the week holding `day`. */
export function weekKeys(day: DayKey): DayKey[] {
  const start = weekStart(day)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** Backfill range: Monday..min(Sunday, today) (<= 7 days); undefined when the whole week is in the future. */
export function weekBackfillRange(day: DayKey, today: DayKey): { from: DayKey; to: DayKey } | undefined {
  const keys = weekKeys(day)
  const from = keys[0]
  const to = keys[6] < today ? keys[6] : today
  return from > to ? undefined : { from, to }
}

/**
 * One backfill pull for the week of `day` (the api throttles per range to once per 15 min). Errors are ignored.
 * A device sync time in the answer lands in the status cache. Returns the cache that was written, if any.
 */
export async function backfillWeek(
  day: DayKey,
  today: DayKey,
  pull: (from: string, to: string) => Promise<PullResult> = apiPull,
): Promise<GarminStatusCache | undefined> {
  const range = weekBackfillRange(day, today)
  if (!range) return undefined
  try {
    const r = await pull(range.from, range.to)
    if (r.kind !== 'ok' || !r.deviceLastSyncAt) return undefined
    const next: GarminStatusCache = { ...(loadStatusCache() ?? { connected: true }), deviceLastSyncAt: r.deviceLastSyncAt }
    saveStatusCache(next)
    return next
  } catch {
    return undefined
  }
}

/** Live Dexie read of the week's 7 `garmin` + 7 `garminDetail` rows, plus one throttled backfill pull. `enabled=false` skips both. */
export function useGarminWeek(
  day: DayKey,
  today: DayKey,
  opts: { enabled?: boolean; onSynced?: (cache: GarminStatusCache) => void } = {},
): WeekData | undefined {
  const { enabled = true, onSynced } = opts
  const start = weekStart(day)
  const data = useLiveQuery(
    async (): Promise<WeekData | undefined> => {
      if (!enabled) return undefined
      const keys = weekKeys(start)
      const [rs, ds] = await Promise.all([db.garmin.bulkGet(keys), db.garminDetail.bulkGet(keys)])
      const rows: WeekData['rows'] = {}
      const details: WeekData['details'] = {}
      keys.forEach((k, i) => {
        rows[k] = rs[i]
        details[k] = ds[i]
      })
      return { rows, details }
    },
    [start, enabled],
  )
  useEffect(() => {
    if (!enabled) return
    let live = true
    void backfillWeek(start, today).then((c) => {
      if (live && c) onSynced?.(c)
    })
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, enabled])
  return data
}
