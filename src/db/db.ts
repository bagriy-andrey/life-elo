import Dexie, { type EntityTable } from 'dexie'
import type { Profile } from '../domain/profile'
import type {
  DayReview,
  GarminDay,
  GarminDetail,
  Habit,
  HabitEntry,
  HabitEvent,
  Reward,
  WellbeingCheckIn,
} from '../domain/types'
import { installOutbox, type OutboxEntry, type SyncState } from '../sync/outbox'
import { buildReview } from './confirm'
import { migrateHabit, migrateReview, type LegacyHabit, type LegacyReview } from './migrate'

/** Garmin day as cached in Dexie: the server record's key (calendar date) is stored as `day`. */
export type GarminRow = GarminDay & { day: string }

/** Garmin detail as cached in Dexie (pull-only), keyed by `day`. */
export type GarminDetailRow = GarminDetail & { day: string }

/**
 * Local-only storage (IndexedDB) on the device.
 * Rating/streaks are NOT stored: they are derived by replaying reviews,
 * so corrections never leave stale or duplicated results.
 */
export const db = new Dexie('life-elo') as Dexie & {
  habits: EntityTable<Habit, 'id'>
  events: EntityTable<HabitEvent, 'id'>
  reviews: EntityTable<DayReview, 'day'>
  wellbeing: EntityTable<WellbeingCheckIn, 'day'>
  rewards: EntityTable<Reward, 'id'>
  profile: EntityTable<Profile, 'id'>
  garmin: EntityTable<GarminRow, 'day'>
  garminDetail: EntityTable<GarminDetailRow, 'day'>
  outbox: EntityTable<OutboxEntry, 'tbl'>
  syncState: EntityTable<SyncState, 'id'>
}

db.version(1).stores({
  habits: 'id, active',
  events: 'id, habitId, day',
  reviews: 'day',
  wellbeing: 'day',
  rewards: 'id, kind, status',
})

// v2: reviews store measured `entries` (legacy per-habit answers rewritten); habits get `versions[0]`.
db.version(2)
  .stores({})
  .upgrade(async (tx) => {
    await tx.table('reviews').toCollection().modify((r: LegacyReview, ref) => {
      ref.value = migrateReview(r)
    })
    await tx.table('habits').toCollection().modify((h: LegacyHabit, ref) => {
      ref.value = migrateHabit(h)
    })
  })

// v3: single-row `profile` store (id 'me'). Never affects Elo.
db.version(3).stores({ profile: 'id' })

// v4: sync outbox (pending changes) and sync state; filled by the DBCore middleware in src/sync/outbox.ts.
db.version(4).stores({ outbox: '[tbl+key]', syncState: 'id' })
installOutbox(db)

// v5: Garmin cache (server-written raw records, pull-only: not in SYNCED_TABLES, never queued).
// Must equal RECORD_SCHEMA in supabase/functions/garmin-pull.
db.version(5).stores({ garmin: 'day' })

// v6: Garmin detail cache (pull-only like `garmin`; record schema 5, tbl 'garmin_detail'). Only adds a table.
db.version(6).stores({ garminDetail: 'day' })

export const newId = () => crypto.randomUUID()

/** Saves (or corrects) a day's review; rejects locked days, bumps revision on corrections. */
export async function confirmDay(
  day: string,
  entries: Record<string, HabitEntry>,
  now: Date,
) {
  await db.transaction('rw', db.reviews, async () => {
    const existing = await db.reviews.get(day)
    await db.reviews.put(buildReview(day, entries, now, existing))
  })
}
