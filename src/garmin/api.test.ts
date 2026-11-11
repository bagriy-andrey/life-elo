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
    invoke.mockResolvedValueOnce({ data: { connected: true, keyExpiresAt: 'x', lastPullAt: null }, error: null })
    expect(await status()).toEqual({ kind: 'connected', keyExpiresAt: 'x', lastPullAt: null })
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

  it('pull triggers a sync and is throttled per range for 15 minutes', async () => {
    invoke.mockResolvedValue({ data: { status: 'ok', days: 2 }, error: null })
    expect(await pull('2026-11-10', '2026-11-11')).toBe('ok')
    expect(requestSync).toHaveBeenCalledTimes(1)
    expect(await pull('2026-11-10', '2026-11-11')).toBe('throttled')
    expect(invoke).toHaveBeenCalledTimes(1)
    expect(await pull('2026-11-09', '2026-11-10')).toBe('ok')
    vi.advanceTimersByTime(15 * 60 * 1000 + 1)
    expect(await pull('2026-11-10', '2026-11-11')).toBe('ok')
  })

  it('pull passes through key_invalid and does not throttle errors', async () => {
    invoke.mockResolvedValueOnce({ data: { status: 'key_invalid' }, error: null })
    expect(await pull('a', 'b')).toBe('key_invalid')
    invoke.mockRejectedValueOnce(new Error('net'))
    expect(await pull('a', 'b')).toBe('error')
    expect(requestSync).not.toHaveBeenCalled()
  })

  it('pull resolves to error after 5 s without throwing', async () => {
    invoke.mockImplementation(() => new Promise(() => {}))
    const p = pull('2026-11-10', '2026-11-11')
    await vi.advanceTimersByTimeAsync(5001)
    expect(await p).toBe('error')
  })
})
