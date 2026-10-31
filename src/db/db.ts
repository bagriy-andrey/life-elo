import Dexie, { type EntityTable } from 'dexie'
import type {
  DayReview,
  Habit,
  HabitEvent,
  Reward,
  WellbeingCheckIn,
} from '../domain/types'

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
}

db.version(1).stores({
  habits: 'id, active',
  events: 'id, habitId, day',
  reviews: 'day',
  wellbeing: 'day',
  rewards: 'id, kind, status',
})

export const newId = () => crypto.randomUUID()

/** Saves (or corrects) a day's review; bumps revision on corrections. */
export async function confirmDay(day: string, outcomes: DayReview['outcomes']) {
  await db.transaction('rw', db.reviews, async () => {
    const existing = await db.reviews.get(day)
    await db.reviews.put({
      day,
      outcomes,
      confirmedAt: Date.now(),
      revision: (existing?.revision ?? 0) + 1,
    })
  })
}
