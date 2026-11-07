import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/db'
import { saveProfile } from '../db/profile'
import { createStatusStore, createSyncEngine } from './engine'
import { getSyncState, setSyncState } from './outbox'
import type { SyncRemote } from './remote'
import { wipeAccountData } from './wipe'

function setup(reset: () => Promise<void> = async () => {}) {
  const remote = {
    push: vi.fn(async () => 0),
    pull: vi.fn(async () => []),
    count: vi.fn(async () => 0),
    reset: vi.fn(reset),
  } as unknown as SyncRemote & { reset: ReturnType<typeof vi.fn> }
  const engine = createSyncEngine({ remote, status: createStatusStore() })
  return { remote, engine }
}

describe('wipeAccountData', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
    await saveProfile({ name: 'A' }, new Date(0))
    await setSyncState({ userId: 'u1', cursor: 42 })
  })

  it('resets the server before clearing locally; keeps userId, cursor 0, empty outbox', async () => {
    let profileAtReset = -1
    const { remote, engine } = setup(async () => {
      profileAtReset = await db.profile.count()
    })
    expect(await db.outbox.count()).toBeGreaterThan(0)
    await wipeAccountData({ engine, remote })
    expect(profileAtReset).toBe(1)
    expect(await db.profile.count()).toBe(0)
    expect(await db.outbox.count()).toBe(0)
    const s = await getSyncState()
    expect(s.userId).toBe('u1')
    expect(s.cursor).toBe(0)
    // engine re-enabled
    await engine.run()
    expect(remote.pull).toHaveBeenCalled()
  })

  it('on server failure keeps everything local, re-enables the engine, rethrows', async () => {
    const { remote, engine } = setup(async () => {
      throw new Error('offline')
    })
    const outboxBefore = await db.outbox.count()
    await expect(wipeAccountData({ engine, remote })).rejects.toThrow('offline')
    expect(await db.profile.count()).toBe(1)
    expect(await db.outbox.count()).toBe(outboxBefore)
    expect((await getSyncState()).cursor).toBe(42)
    await engine.run()
    expect(remote.pull).toHaveBeenCalled()
  })
})
