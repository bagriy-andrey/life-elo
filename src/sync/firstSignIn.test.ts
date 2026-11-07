import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import type { Habit } from '../domain/types'
import { claimDevice, isClaimedBy } from './firstSignIn'
import { clearLocalData, getSyncState, setSyncState } from './outbox'

const habit = (id: string) => ({ id, name: id, active: true, createdAt: 1, effectiveFrom: '2026-01-01' }) as unknown as Habit

beforeEach(async () => {
  await clearLocalData()
})

describe('claimDevice', () => {
  it('drops data from before accounts and never uploads it', async () => {
    await db.habits.bulkPut([habit('a'), habit('b')])
    await db.profile.put({ id: 'me', name: 'A', createdAt: 1 })
    expect(await claimDevice('u1')).toBe(true)
    expect(await db.habits.count()).toBe(0)
    expect(await db.profile.count()).toBe(0)
    expect(await db.outbox.count()).toBe(0)
    expect(await getSyncState()).toMatchObject({ userId: 'u1', cursor: 0 })
  })

  it("drops another account's data, including its pending changes", async () => {
    await setSyncState({ userId: 'other', cursor: 7 })
    await db.habits.put(habit('x'))
    expect(await claimDevice('u1')).toBe(true)
    expect(await db.habits.count()).toBe(0)
    expect(await db.outbox.count()).toBe(0)
    expect(await getSyncState()).toMatchObject({ userId: 'u1', cursor: 0 })
  })

  it('keeps the cache of the same user untouched', async () => {
    await setSyncState({ userId: 'u1', cursor: 5 })
    await db.habits.put(habit('a'))
    expect(await isClaimedBy('u1')).toBe(true)
    expect(await claimDevice('u1')).toBe(false)
    expect(await db.habits.count()).toBe(1)
    expect(await db.outbox.count()).toBe(1)
    expect((await getSyncState()).cursor).toBe(5)
  })
})
