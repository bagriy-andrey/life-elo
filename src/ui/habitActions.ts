import { db } from '../db/db'
import { deleteHabit, ReducerInUseError } from '../db/habits'
import type { Habit } from '../domain/types'

/** Pauses an active habit or resumes a paused one. */
export async function togglePause(habit: Habit): Promise<void> {
  await db.habits.update(habit.id, { active: !habit.active })
}

/** Deletes the habit; if it is a reducer for others, reports their names (`«A», «B»`) instead. */
export async function removeHabit(habit: Habit): Promise<{ ok: true } | { ok: false; names: string }> {
  try {
    await deleteHabit(habit.id)
    return { ok: true }
  } catch (e) {
    if (!(e instanceof ReducerInUseError)) throw e
    return { ok: false, names: e.users.map((u) => `«${u.name}»`).join(', ') }
  }
}
