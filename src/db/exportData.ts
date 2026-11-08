import type { DayKey, DayReview, Habit } from '../domain/types'
import type { RulesetConfig } from '../engine/config'
import { replay } from '../engine/rating'
import { SYNCED_TABLES, type SyncedTable } from '../sync/outbox'
import { db } from './db'

export interface ExportHistoryEntry {
  day: DayKey
  delta: number
  rating: number
}

export interface ExportPayload {
  app: 'life-elo'
  version: string
  exportedAt: string
  data: Record<SyncedTable, unknown[]>
  rating: {
    derived: true
    note: string
    current: number
    history: ExportHistoryEntry[]
  }
}

export const RATING_NOTE =
  'Derived by replaying confirmed reviews; informational only, never imported or synced.'

/** Reads every synced table from Dexie (raw records only). */
export async function readExportTables(): Promise<Record<SyncedTable, unknown[]>> {
  const out = {} as Record<SyncedTable, unknown[]>
  for (const t of SYNCED_TABLES) out[t] = await db.table(t).toArray()
  return out
}

/** Per-day rating history from the same replay Home uses. Nothing is persisted. */
export function exportLedger(
  habits: Habit[],
  reviews: DayReview[],
  ruleset: RulesetConfig,
  today: DayKey,
): ExportHistoryEntry[] {
  return replay(habits, reviews, ruleset, today).ledger.map((e) => ({
    day: e.day,
    delta: e.delta,
    rating: e.ratingAfter,
  }))
}

export function buildExport(
  input: { tables: Record<SyncedTable, unknown[]>; ledger: ExportHistoryEntry[] },
  now: Date,
  version: string,
): ExportPayload {
  const { tables, ledger } = input
  return {
    app: 'life-elo',
    version,
    exportedAt: now.toISOString(),
    data: tables,
    rating: {
      derived: true,
      note: RATING_NOTE,
      current: ledger.length ? ledger[ledger.length - 1].rating : 0,
      history: ledger,
    },
  }
}

/** Shares the file via Web Share when possible, else triggers a download. */
export async function deliverExport(json: string, filename: string): Promise<'shared' | 'cancelled'> {
  const file = new File([json], filename, { type: 'application/json' })
  const nav = typeof navigator !== 'undefined' ? navigator : undefined
  if (nav?.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: filename })
      return 'shared'
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return 'cancelled'
      throw e
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
  return 'shared'
}
