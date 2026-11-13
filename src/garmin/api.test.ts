import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const invoke = vi.fn()
vi.mock('../auth/supabase', () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } } }))
const requestSync = vi.fn(async () => {})
vi.mock('../sync/engine', () => ({ requestSync: () => requestSync() }))

import { connect, disconnect, pull, resetGarminThrottle, status } from './api'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-12T08:00:00Z'))
  invoke.mockReset()
  requestSync.mockClear()
  resetGarminThrottle()
})
afterEach(() => vi.useRealTimers())

describe('garmin api', () => {
  it('status maps connected / not connected / failure', async () => {
    invoke.mockResolvedValueOnce({ data: { connected: true, keyExpiresAt: 'x', lastPullAt: null, lastAttemptAt: 'a', lastError: 'key_invalid' }, error: null })
    expect(await status()).toEqual({ kind: 'connected', keyExpiresAt: 'x', lastPullAt: null, lastAttemptAt: 'a', lastError: 'key_invalid' })
    invoke.mockResolvedValueOnce({ data: { connected: false }, error: null })
    expect(await status()).toEqual({ kind: 'not_connected' })
    invoke.mockRejectedValueOnce(new Error('boom'))
    expect(await status()).toEqual({ kind: 'error' })
  })

  it('connect and disconnect', async () => {
    invoke.mockResolvedValueOnce({ data: { status: 'connected', keyExpiresAt: 'e' }, error: null })
    expect(await connect('k', 365)).toEqual({ kind: 'connected', keyExpiresAt: 'e' })
    expect(invoke).toHaveBeenCalledWith('garmin-connect', expect.objectContaining({ method: 'POST', body: { key: 'k', lifetimeDays: 365 } }))
    invoke.mockResolvedValueOnce({ data: null, error: { context: new Response(JSON.stringify({ status: 'key_invalid' }), { status: 400 }) } })
    expect(await connect('bad', 30)).toEqual({ kind: 'key_invalid' })
    invoke.mockResolvedValueOnce({ data: { status: 'disconnected' }, error: null })
    expect(await disconnect()).toBe('ok')
  })

  const ok = { status: 'ok', lastPullAt: 'L', deviceLastSyncAt: 'D', coverage: { '2026-11-11': { steps: true, sleep: false, activities: 0 } } }

  it('pull returns coverage, triggers a sync and is throttled per range for 15 minutes', async () => {
    invoke.mockResolvedValue({ data: ok, error: null })
    expect(await pull('2026-11-10', '2026-11-11')).toEqual({
      kind: 'ok',
      lastPullAt: 'L',
      deviceLastSyncAt: 'D',
      coverage: ok.coverage,
    })
    expect(requestSync).toHaveBeenCalledTimes(1)
    expect(await pull('2026-11-10', '2026-11-11')).toEqual({ kind: 'throttled' })
    expect(invoke).toHaveBeenCalledTimes(1)
    expect((await pull('2026-11-09', '2026-11-10')).kind).toBe('ok')
    vi.advanceTimersByTime(15 * 60 * 1000 + 1)
    expect((await pull('2026-11-10', '2026-11-11')).kind).toBe('ok')
  })

  it('force bypasses the throttle; deviceLastSyncAt is optional', async () => {
    invoke.mockResolvedValue({ data: { status: 'ok', lastPullAt: 'L', coverage: {} }, error: null })
    expect(await pull('a', 'b')).toEqual({ kind: 'ok', lastPullAt: 'L', coverage: {} })
    expect((await pull('a', 'b', { force: true })).kind).toBe('ok')
    expect(invoke).toHaveBeenCalledTimes(2)
  })

  it('pull maps key_invalid / not_connected / stage errors / network, never throttling failures', async () => {
    invoke.mockResolvedValueOnce({ data: { status: 'key_invalid' }, error: null })
    expect(await pull('a', 'b')).toEqual({ kind: 'key_invalid' })
    invoke.mockResolvedValueOnce({ data: { status: 'not_connected' }, error: null })
    expect(await pull('a', 'b')).toEqual({ kind: 'not_connected' })
    invoke.mockResolvedValueOnce({ data: { status: 'error', stage: 'garmin' }, error: null })
    expect(await pull('a', 'b')).toEqual({ kind: 'error', stage: 'garmin' })
    invoke.mockResolvedValueOnce({ data: { status: 'error', stage: 'weird' }, error: null })
    expect(await pull('a', 'b')).toEqual({ kind: 'error', stage: 'unknown' })
    invoke.mockRejectedValueOnce(new Error('net'))
    expect(await pull('a', 'b')).toEqual({ kind: 'offline' })
    expect(requestSync).not.toHaveBeenCalled()
  })

  it('pull resolves to timeout after 20 s without throwing', async () => {
    invoke.mockImplementation(() => new Promise(() => {}))
    const p = pull('2026-11-10', '2026-11-11')
    await vi.advanceTimersByTimeAsync(19_000)
    let settled = false
    void p.then(() => (settled = true))
    await vi.advanceTimersByTimeAsync(0)
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(1001)
    expect(await p).toEqual({ kind: 'timeout' })
  })
})
