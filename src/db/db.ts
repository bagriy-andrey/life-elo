import Dexie, { type EntityTable } from 'dexie'
import type { Profile } from '../domain/profile'
import type {
  DayReview,
  Habit,
  HabitEntry,
  HabitEvent,
  Reward,
  WellbeingCheckIn,
} from '../domain/types'
import { buildReview } from './confirm'
import { migrateHabit, migrateReview, type LegacyHabit, type LegacyReview } from './migrate'

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
