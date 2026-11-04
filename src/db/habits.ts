import type { Habit } from '../domain/types'
import { reducerUsers, withoutHabit } from '../domain/habitSetup'
import { db } from './db'

/** Thrown when other habits' quotas still depend on the habit being deleted. */
export class ReducerInUseError extends Error {
  readonly users: Habit[]
  constructor(users: Habit[]) {
    super(`Habit is a reducer for: ${users.map((h) => h.name).join(', ')}`)
    this.name = 'ReducerInUseError'
    this.users = users
  }
}

/**
 * Deletes a habit with its answers and events in one transaction.
 * The reducer guard runs first, before any write. Rating is replayed from the remaining data.
 */
export async function deleteHabit(habitId: string): Promise<void> {
  await db.transaction('rw', db.habits, db.reviews, db.events, async () => {
    const users = reducerUsers(habitId, await db.habits.toArray())
    if (users.length > 0) throw new ReducerInUseError(users)
    const reviews = await db.reviews.toArray()
    await db.reviews.bulkPut(
      reviews.filter((r) => habitId in r.entries).map((r) => withoutHabit(r, habitId)),
    )
    await db.events.where('habitId').equals(habitId).delete()
    await db.habits.delete(habitId)
  })
}
