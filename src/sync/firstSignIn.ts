import { db } from '../db/db'
import { firstSignInMode } from './merge'
import { clearLocalData, getSyncState, setSyncState, SYNCED_TABLES, type OutboxEntry } from './outbox'
import type { SyncRemote } from './remote'

export type FirstSignInMode = ReturnType<typeof firstSignInMode>

export async function countLocal(): Promise<number> {
  const counts = await Promise.all(SYNCED_TABLES.map((t) => db.table(t).count()))
  return counts.reduce((a, b) => a + b, 0)
}

/** Throws when the remote count cannot be read (offline): the caller must not decide without it. */
export async function prepareFirstSignIn(userId: string, remote: SyncRemote): Promise<FirstSignInMode> {
  const { userId: syncedUserId } = await getSyncState()
  if (syncedUserId === userId) return 'none'
  const [localCount, remoteCount] = await Promise.all([countLocal(), remote.count()])
  return firstSignInMode({ syncedUserId, userId, localCount, remoteCount })
}

/** Enqueues every local row (one transaction), then marks the device as synced with this user. */
export async function uploadLocal(userId: string): Promise<void> {
  await db.transaction('rw', [...SYNCED_TABLES.map((t) => db.table(t)), db.outbox, db.syncState], async () => {
    const changedAt = Date.now()
    const entries: OutboxEntry[] = []
    for (const tbl of SYNCED_TABLES) {
      for (const key of (await db.table(tbl).toCollection().primaryKeys()) as unknown[]) {
        entries.push({ tbl, key: String(key), changedAt })
      }
    }
    await db.outbox.clear()
    await db.outbox.bulkPut(entries)
    await setSyncState({ userId, cursor: 0 })
  })
}

/** Local data is dropped; the sync engine pulls everything afterwards. Stop sync first (see `stopSync`). */
export async function adoptRemote(userId: string): Promise<void> {
  await clearLocalData()
  await setSyncState({ userId, cursor: 0 })
}

/** Local is empty: claim the device; a previous account's pending tombstones must not reach this one. */
export async function claimEmptyDevice(userId: string): Promise<void> {
  await db.transaction('rw', db.outbox, db.syncState, async () => {
    await db.outbox.clear()
    await setSyncState({ userId, cursor: 0 })
  })
}

export async function keepDevice(userId: string, remote: SyncRemote): Promise<void> {
  await remote.reset()
  await uploadLocal(userId)
}

/** Automatic modes. Returns true when the device is now claimed; false for 'ask' (needs the choice screen). */
export async function resolveAutomatic(mode: FirstSignInMode, userId: string): Promise<boolean> {
  if (mode === 'none') return true
  if (mode === 'upload') await uploadLocal(userId)
  else if (mode === 'pull') await claimEmptyDevice(userId)
  else return false
  return true
}
