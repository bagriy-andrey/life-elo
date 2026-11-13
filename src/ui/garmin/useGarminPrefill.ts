import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { pull as pullGarmin, type PullResult } from '../../garmin/api'
import { db, type GarminRow } from '../../db/db'
import { addDays } from '../../domain/day'
import { garminEvidence, type GarminSuggestion } from '../../domain/garminPrefill'
import type { DayKey, GarminDay, Habit } from '../../domain/types'

interface Options {
  day: DayKey
  habits: Habit[]
  /** Pull and suggest only when true (signed in, day not yet confirmed/locked). */
  enabled: boolean
  /** Preview/test seams. */
  initialPull?: PullResult
  rows?: GarminRow[]
}

export interface GarminPrefill {
  /** Suggested answers with evidence per habit id; empty when disabled or no data. */
  suggestions: Record<string, GarminSuggestion>
  /** Garmin rows for `day` and `day + 1` (the night's bedtime lives on the next date). */
  rows: GarminRow[] | undefined
  pull: PullResult | undefined
  refresh: () => void
}

/** Pulls Garmin data for the reviewed day and derives suggested answers (never confirms anything). */
export function useGarminPrefill({ day, habits, enabled, initialPull, rows: rowsSeam }: Options): GarminPrefill {
  const [pull, setPull] = useState<PullResult | undefined>(initialPull)
  const refresh = () => {
    setPull(undefined)
    void pullGarmin(day, addDays(day, 1), { force: true }).then(setPull)
  }
  useEffect(() => {
    if (enabled) void pullGarmin(day, addDays(day, 1)).then(setPull)
    // Once per opened day; the api never throws and handles not_connected/offline.
  }, [day, enabled])

  const live = useLiveQuery(
    async () => (await db.garmin.bulkGet([day, addDays(day, 1)])).filter((r) => r !== undefined),
    [day],
  )
  const rows = rowsSeam ?? live
  const suggestions = useMemo(() => {
    if (!enabled || !rows?.length) return {}
    const byDay: Record<string, GarminDay> = {}
    for (const r of rows) byDay[r.day] = r
    return garminEvidence(habits, day, byDay)
  }, [enabled, rows, habits, day])
  return { suggestions, rows, pull, refresh }
}
