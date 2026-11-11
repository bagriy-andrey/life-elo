import { db } from '../db/db'
import type { SyncEngine } from './engine'
import { applyRemote, setSyncState } from './outbox'
import type { SyncRemote } from './remote'

export interface WipeDeps {
  engine: Pick<SyncEngine, 'disable' | 'enable' | 'settled'>
  remote: Pick<SyncRemote, 'reset'>
}

/**
 * Deletes the account's data on the server, then locally. Server first: if it fails (e.g. offline)
 * nothing local is touched, sync is re-enabled and the error is rethrown. Locally the user stays
 * claimed (`userId` kept, cursor 0), so the emptied data is not re-pulled or re-uploaded.
 */
export async function wipeAccountData({ engine, remote }: WipeDeps): Promise<void> {
  engine.disable()
  try {
    await engine.settled()
    await remote.reset()
  } catch (e) {
    engine.enable()
    throw e
  }
  try {
    await applyRemote(async () => {
      await Promise.all([
        db.habits.clear(),
        db.events.clear(),
        db.reviews.clear(),
        db.wellbeing.clear(),
        db.rewards.clear(),
        db.profile.clear(),
        db.garmin.clear(),
        db.outbox.clear(),
      ])
      await setSyncState({ cursor: 0 })
    })
  } finally {
    engine.enable()
  }
}
