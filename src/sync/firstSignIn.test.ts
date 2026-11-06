import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import type { Habit } from '../domain/types'
import { adoptRemote, keepDevice, prepareFirstSignIn, resolveAutomatic, uploadLocal } from './firstSignIn'
import { clearLocalData, getSyncState, setSyncState } from './outbox'
import type { SyncRemote } from './remote'

class FakeRemote implements SyncRemote {
  n = 0
  failCount = false
  calls: string[] = []
  async push() {
    return 0
  }
  async pull() {
    return []
  }
  async count() {
    if (this.failCount) throw new TypeError('Failed to fetch')
    return this.n
  }
  async reset() {
    this.calls.push('reset')
    this.n = 0
  }
}

const habit = (id: string) => ({ id, name: id, active: true, createdAt: 1, effectiveFrom: '2026-01-01' }) as unknown as Habit

beforeEach(async () => {
  await clearLocalData()
})

describe('first sign-in', () => {
  it('a profile-only device is non-empty and uploaded', async () => {
    await db.profile.put({ id: 'me', name: 'A', createdAt: 1 })
    await db.outbox.clear()
    const remote = new FakeRemote()
    expect(await prepareFirstSignIn('u1', remote)).toBe('upload')
    await uploadLocal('u1')
    expect((await db.outbox.toArray()).map((o) => `${o.tbl}/${o.key}`)).toEqual(['profile/me'])
  })

  it('upload: enqueues all local rows and sets userId', async () => {
    await db.habits.bulkPut([habit('a'), habit('b')])
    await db.reviews.put({ day: '2026-01-01' } as never)
    await db.outbox.clear()
    const remote = new FakeRemote()
    const mode = await prepareFirstSignIn('u1', remote)
    expect(mode).toBe('upload')
    await resolveAutomatic(mode, 'u1')
    const keys = (await db.outbox.toArray()).map((e) => `${e.tbl}/${e.key}`).sort()
    expect(keys).toEqual(['habits/a', 'habits/b', 'reviews/2026-01-01'])
    expect(await getSyncState()).toMatchObject({ userId: 'u1', cursor: 0 })
  })

  it('pull: empty device just claims the user', async () => {
    const remote = new FakeRemote()
    remote.n = 3
    const mode = await prepareFirstSignIn('u1', remote)
    expect(mode).toBe('pull')
    expect(await resolveAutomatic(mode, 'u1')).toBe(true)
    expect((await getSyncState()).userId).toBe('u1')
    expect(await db.outbox.count()).toBe(0)
  })

  it('ask when both sides have data, including a different previous user', async () => {
    await db.habits.put(habit('a'))
    await setSyncState({ userId: 'other', cursor: 5 })
    const remote = new FakeRemote()
    remote.n = 2
    const mode = await prepareFirstSignIn('u1', remote)
    expect(mode).toBe('ask')
    expect(await resolveAutomatic(mode, 'u1')).toBe(false)
  })

  it('adoptRemote clears local data and sets userId with cursor 0', async () => {
    await db.habits.put(habit('a'))
    await setSyncState({ cursor: 9 })
    await adoptRemote('u1')
    expect(await db.habits.count()).toBe(0)
    expect(await db.outbox.count()).toBe(0)
    expect(await getSyncState()).toMatchObject({ userId: 'u1', cursor: 0 })
  })

  it('keepDevice resets remote then uploads local', async () => {
    await db.habits.put(habit('a'))
    const remote = new FakeRemote()
    remote.n = 4
    await keepDevice('u1', remote)
    expect(remote.calls).toEqual(['reset'])
    expect((await db.outbox.toArray()).map((e) => e.key)).toEqual(['a'])
    expect((await getSyncState()).userId).toBe('u1')
  })

  it('none never blocks, even when the remote is unreachable', async () => {
    await setSyncState({ userId: 'u1', cursor: 1 })
    const remote = new FakeRemote()
    remote.failCount = true
    expect(await prepareFirstSignIn('u1', remote)).toBe('none')
  })

  it('unknown remote state throws instead of deciding', async () => {
    await db.habits.put(habit('a'))
    const remote = new FakeRemote()
    remote.failCount = true
    await expect(prepareFirstSignIn('u1', remote)).rejects.toThrow()
    expect((await getSyncState()).userId).toBeUndefined()
  })

  it('uploadLocal is exported for direct use', async () => {
    await uploadLocal('u2')
    expect((await getSyncState()).userId).toBe('u2')
  })
})
