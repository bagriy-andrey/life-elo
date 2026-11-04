import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import type { Habit } from '../domain/types'
import { createStatusStore, createSyncEngine } from './engine'
import type { PushItem, RemoteRecord } from './merge'
import { applyRemote, clearLocalData, getSyncState, setSyncState } from './outbox'
import type { SyncRemote } from './remote'

class FakeRemote implements SyncRemote {
  rows = new Map<string, RemoteRecord>()
  rev = 0
  pushes = 0
  failPull = false
  beforePush?: () => Promise<void>
  async push(items: PushItem[]) {
    this.pushes++
    await this.beforePush?.()
    let n = 0
    for (const i of items) {
      const k = `${i.tbl}/${i.key}`
      const cur = this.rows.get(k)
      if (cur && Date.parse(i.client_updated_at) < Date.parse(cur.client_updated_at)) continue
      this.rows.set(k, { ...i, data: i.deleted ? null : i.data, rev: ++this.rev })
      n++
    }
    return n
  }
  async pull(after: number, limit: number) {
    if (this.failPull) throw new TypeError('Failed to fetch')
    return [...this.rows.values()].filter((r) => r.rev > after).sort((a, b) => a.rev - b.rev).slice(0, limit)
  }
  async count() {
    return this.rows.size
  }
  async reset() {
    this.rows.clear()
  }
}

const habit = (id: string, name = id): Habit =>
  ({
    id,
    name,
    direction: 'constructive',
    active: true,
    createdAt: 0,
    effectiveFrom: '2026-01-05',
    versions: [{ from: '2026-01-05', tier: 'medium', rule: { kind: 'boolean' } }],
  }) as unknown as Habit

type Snap = Awaited<ReturnType<typeof save>>
const save = async () => ({
  habits: await db.habits.toArray(),
  outbox: await db.outbox.toArray(),
  state: await getSyncState(),
})
// "Switching device": wipe the single fake-indexeddb and restore that device's state.
const load = async (s: Snap) => {
  await clearLocalData()
  await applyRemote(async () => {
    await db.habits.bulkPut(s.habits)
    await db.outbox.bulkPut(s.outbox)
    await setSyncState({ cursor: s.state.cursor })
  })
}

const engine = (remote: FakeRemote, now?: () => number) =>
  createSyncEngine({ remote, status: createStatusStore(), now })

const tick = () => new Promise((r) => setTimeout(r, 5))
const blank: Snap = { habits: [], outbox: [], state: { id: 'state', cursor: 0 } }

beforeEach(async () => {
  await clearLocalData()
})

describe('sync engine', () => {
  it('two devices converge; later offline edit wins; tombstones propagate', async () => {
    const remote = new FakeRemote()
    const e = engine(remote)
    await db.habits.put(habit('a', 'one'))
    await e.run()
    const devA = await save()
    await load(blank)
    await e.run()
    expect((await db.habits.get('a'))?.name).toBe('one')
    // B edits offline later than A
    await tick()
    await db.habits.update('a', { name: 'B-edit' })
    const devB = await save()
    await load(devA)
    await tick()
    await db.habits.update('a', { name: 'A-edit' }) // later in wall time than B's edit
    const devA2 = await save()
    // B syncs first, then A: A's edit is newer -> wins
    await load(devB)
    await e.run()
    await load(devA2)
    await e.run()
    expect((await db.habits.get('a'))?.name).toBe('A-edit')
    await load(devB)
    await e.run()
    expect((await db.habits.get('a'))?.name).toBe('A-edit')
    // tombstone
    await db.habits.delete('a')
    await e.run()
    expect(remote.rows.get('habits/a')?.deleted).toBe(true)
    await load(devA2)
    await e.run()
    expect(await db.habits.get('a')).toBeUndefined()
  })

  it('offline edit that is older than remote loses', async () => {
    const remote = new FakeRemote()
    const e = engine(remote)
    await db.habits.put(habit('a', 'old'))
    const dev1 = await save()
    await tick()
    await load(blank)
    await db.habits.put(habit('a', 'newer'))
    await e.run()
    await load(dev1)
    await e.run()
    expect((await db.habits.get('a'))?.name).toBe('newer')
    expect(await db.outbox.count()).toBe(0)
  })

  it('outbox entry changed during push is kept', async () => {
    const remote = new FakeRemote()
    await db.habits.put(habit('a', 'v1'))
    remote.beforePush = async () => {
      await tick()
      await db.habits.update('a', { name: 'v2' })
    }
    const e = engine(remote)
    await e.run()
    // v2 edit happened mid-push; its outbox entry survived and the follow-up is not auto-run
    expect(await db.outbox.count()).toBe(1)
    remote.beforePush = undefined
    await e.run()
    expect(await db.outbox.count()).toBe(0)
    expect(((remote.rows.get('habits/a')?.data ?? {}) as Habit).name).toBe('v2')
  })

  it('single-flight: concurrent calls schedule exactly one follow-up', async () => {
    const remote = new FakeRemote()
    const e = engine(remote)
    await db.habits.put(habit('a'))
    const ps = [e.run(), e.run(), e.run()]
    await Promise.all(ps)
    // first run pushes (1 push), follow-up run has nothing to push
    expect(remote.pushes).toBe(1)
    let pulls = 0
    const orig = remote.pull.bind(remote)
    remote.pull = async (a, l) => (pulls++, orig(a, l))
    await Promise.all([e.run(), e.run(), e.run()])
    expect(pulls).toBe(2)
  })

  it('schema newer than the app stops without advancing the cursor', async () => {
    const remote = new FakeRemote()
    remote.rows.set('habits/z', {
      tbl: 'habits', key: 'z', data: habit('z'), deleted: false, schema: db.verno + 1,
      client_updated_at: new Date().toISOString(), rev: ++remote.rev,
    })
    const e = engine(remote)
    await e.run()
    expect(e.status.get().kind).toBe('update-required')
    expect((await getSyncState()).cursor).toBe(0)
    expect(await db.habits.count()).toBe(0)
  })

  it('pulled writes do not enqueue; cursor and lastSyncedAt are saved', async () => {
    const remote = new FakeRemote()
    remote.rows.set('habits/z', {
      tbl: 'habits', key: 'z', data: habit('z'), deleted: false, schema: db.verno,
      client_updated_at: new Date().toISOString(), rev: ++remote.rev,
    })
    const e = engine(remote, () => 1234)
    await e.run()
    expect(await db.habits.count()).toBe(1)
    expect(await db.outbox.count()).toBe(0)
    const st = await getSyncState()
    expect(st.cursor).toBe(1)
    expect(st.lastSyncedAt).toBe(1234)
    expect(e.status.get()).toEqual({ kind: 'idle', lastSyncedAt: 1234 })
  })

  it('network failure -> offline; resync resets the cursor', async () => {
    const remote = new FakeRemote()
    const e = engine(remote)
    remote.failPull = true
    await e.run()
    expect(e.status.get().kind).toBe('offline')
    remote.failPull = false
    await db.habits.put(habit('a'))
    await e.run()
    await setSyncState({ cursor: 99 })
    await e.resync()
    expect((await getSyncState()).cursor).toBe(1)
  })
})
