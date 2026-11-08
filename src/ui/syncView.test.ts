import { describe, expect, it } from 'vitest'
import { syncView } from './syncView'

const t = ((k: string, p?: Record<string, string | number>) =>
  p ? `${k}:${Object.values(p).join('|')}` : k) as never

describe('syncView', () => {
  it('idle synced today is ok', () => {
    const v = syncView({ kind: 'idle', lastSyncedAt: Date.now() }, t, 'en')
    expect(v.tone).toBe('ok')
    expect(v.label.startsWith('sync.syncedAt')).toBe(true)
  })
  it('idle synced on another day is ok with date', () => {
    const v = syncView({ kind: 'idle', lastSyncedAt: Date.now() - 3 * 86400000 }, t, 'en')
    expect(v.tone).toBe('ok')
    expect(v.label.startsWith('sync.syncedOn')).toBe(true)
  })
  it('never synced is busy', () => {
    expect(syncView({ kind: 'idle' }, t, 'en')).toEqual({ tone: 'busy', label: 'sync.never' })
  })
  it('syncing and offline are busy', () => {
    expect(syncView({ kind: 'syncing' }, t, 'en')).toEqual({ tone: 'busy', label: 'sync.syncing' })
    expect(syncView({ kind: 'offline', lastSyncedAt: 1 }, t, 'en')).toEqual({
      tone: 'busy',
      label: 'sync.offline',
    })
  })
  it('error and update-required are err', () => {
    expect(syncView({ kind: 'error' }, t, 'en')).toEqual({ tone: 'err', label: 'sync.error' })
    expect(syncView({ kind: 'update-required' }, t, 'en')).toEqual({
      tone: 'err',
      label: 'sync.updateRequired',
    })
  })
})
