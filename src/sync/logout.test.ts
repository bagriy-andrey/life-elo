import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { createStatusStore, createSyncEngine } from './engine'
import { performLogout } from './logout'
import type { SyncRemote } from './remote'

function remote() {
  const r = { push: vi.fn(async () => 0), pull: vi.fn(async () => []), count: vi.fn(async () => 0), reset: vi.fn(async () => {}) }
  return r as typeof r & SyncRemote
}

describe('performLogout', () => {
  it('clears data after sign-out succeeds; later runs hit no remote', async () => {
    const r = remote()
    const engine = createSyncEngine({ remote: r, status: createStatusStore() })
    const order: string[] = []
    const res = await performLogout({
      engine,
      signOut: async () => (order.push('signOut'), {}),
      clearLocalData: async () => void order.push('clear'),
    })
    expect(res.ok).toBe(true)
    expect(order).toEqual(['signOut', 'clear'])
    await engine.run()
    await engine.resync()
    expect(r.push).not.toHaveBeenCalled()
    expect(r.pull).not.toHaveBeenCalled()
    engine.enable()
    await engine.run()
    expect(r.pull).toHaveBeenCalled()
  })

  it('does not wipe data when sign-out fails', async () => {
    const clear = vi.fn(async () => {})
    const res = await performLogout({
      engine: createSyncEngine({ remote: remote(), status: createStatusStore() }),
      signOut: async () => ({ error: 'x' }),
      clearLocalData: clear,
    })
    expect(res.ok).toBe(false)
    expect(clear).not.toHaveBeenCalled()
  })
})
