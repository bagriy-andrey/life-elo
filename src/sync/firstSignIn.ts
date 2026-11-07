import { clearLocalData, getSyncState, setSyncState } from './outbox'

/**
 * The server is the source of truth; the device only caches the signed-in account's data.
 * On sign-in, anything not cached for this user (another account's data, or data from before
 * accounts existed) is dropped and the sync engine pulls everything. Local data is never uploaded
 * into an account. Stop sync first (see `stopSync` in App).
 * Returns true when the device was re-claimed (the caller had to stop sync).
 */
export async function claimDevice(userId: string): Promise<boolean> {
  const { userId: syncedUserId } = await getSyncState()
  if (syncedUserId === userId) return false
  await clearLocalData()
  await setSyncState({ userId, cursor: 0 })
  return true
}

/** True when this device already caches `userId` (no claim needed). */
export async function isClaimedBy(userId: string): Promise<boolean> {
  return (await getSyncState()).userId === userId
}
