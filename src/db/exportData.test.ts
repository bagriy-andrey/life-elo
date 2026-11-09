import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DayReview, Habit } from '../domain/types'
import { RULESET_V1 } from '../engine/config'
import { replay } from '../engine/rating'
import { SYNCED_TABLES, type SyncedTable } from '../sync/outbox'
import { buildExport, deliverExport, exportLedger } from './exportData'

const START = '2026-01-01'
const habit: Habit = {
  id: 'gym',
  name: 'gym',
  direction: 'constructive',
  versions: [{ from: START, tier: 'medium', rule: { kind: 'boolean' } }],
  active: true,
  effectiveFrom: START,
  createdAt: 0,
}
const review = (day: string, value: boolean): DayReview => ({
  day,
  entries: { gym: { kind: 'value', value } },
  confirmedAt: 0,
  revision: 1,
})
const reviews = [review('2026-01-01', true), review('2026-01-02', true), review('2026-01-03', false)]
const TODAY = '2026-01-04'

const emptyTables = () =>
  Object.fromEntries(SYNCED_TABLES.map((t) => [t, []])) as unknown as Record<SyncedTable, unknown[]>

describe('exportLedger / buildExport', () => {
  it('history matches replay and current equals last rating', () => {
    const history = exportLedger([habit], reviews, RULESET_V1, TODAY)
    const ref = replay([habit], reviews, RULESET_V1, TODAY)
    expect(history.length).toBe(ref.ledger.length)
    expect(history.length).toBeGreaterThan(0)
    history.forEach((h, i) => {
      expect(h).toEqual({ day: ref.ledger[i].day, delta: ref.ledger[i].delta, rating: ref.ledger[i].ratingAfter })
    })
    const p = buildExport({ tables: emptyTables(), ledger: history }, new Date('2026-01-04T10:00:00Z'), '0.9.0')
    expect(p.rating.derived).toBe(true)
    expect(p.rating.current).toBe(history[history.length - 1].rating)
    expect(p.rating.current).toBe(ref.rating)
    expect(p.app).toBe('life-elo')
    expect(p.version).toBe('0.9.0')
    expect(p.exportedAt).toBe('2026-01-04T10:00:00.000Z')
    expect(Object.keys(p.data).sort()).toEqual([...SYNCED_TABLES].sort())
  })

  it('empty ledger => current 0, empty history', () => {
    const p = buildExport({ tables: emptyTables(), ledger: exportLedger([], [], RULESET_V1, TODAY) }, new Date(), 'x')
    expect(p.rating.current).toBe(0)
    expect(p.rating.history).toEqual([])
  })
})

describe('deliverExport', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shares a file when canShare accepts it', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { canShare: () => true, share })
    expect(await deliverExport('{}', 'a.json')).toBe('shared')
    expect(share).toHaveBeenCalledOnce()
  })

  it('AbortError => cancelled; other errors reject', async () => {
    const abort = Object.assign(new Error('x'), { name: 'AbortError' })
    vi.stubGlobal('navigator', { canShare: () => true, share: vi.fn().mockRejectedValue(abort) })
    expect(await deliverExport('{}', 'a.json')).toBe('cancelled')
    vi.stubGlobal('navigator', { canShare: () => true, share: vi.fn().mockRejectedValue(new Error('boom')) })
    await expect(deliverExport('{}', 'a.json')).rejects.toThrow('boom')
  })

  it('falls back to an <a download> link', async () => {
    const a = { href: '', download: '', click: vi.fn(), remove: vi.fn() }
    vi.stubGlobal('navigator', {})
    vi.stubGlobal('document', { createElement: () => a, body: { appendChild: vi.fn() } })
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    expect(await deliverExport('{}', 'a.json')).toBe('shared')
    expect(a.download).toBe('a.json')
    expect(a.href).toBe('blob:x')
    expect(a.click).toHaveBeenCalled()
  })
})
