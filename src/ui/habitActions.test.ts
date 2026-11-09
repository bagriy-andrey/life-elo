import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import type { Habit } from '../domain/types'
import { removeHabit, togglePause } from './habitActions'

const rule = { kind: 'boolean' } as never
const mk = (id: string, name: string, quota?: object): Habit =>
  ({
    id,
    name,
    direction: 'destructive',
    versions: [{ from: '2026-01-01', tier: 'weak', rule, ...(quota ? { quota } : {}) }],
    active: true,
    effectiveFrom: '2026-01-01',
    createdAt: 0,
  }) as unknown as Habit

beforeEach(async () => {
  await db.habits.clear()
  await db.reviews.clear()
  await db.events.clear()
})

describe('habitActions', () => {
  it('togglePause flips active both ways', async () => {
    const h = mk('a', 'A')
    await db.habits.add(h)
    await togglePause(h)
    expect((await db.habits.get('a'))?.active).toBe(false)
    await togglePause({ ...h, active: false })
    expect((await db.habits.get('a'))?.active).toBe(true)
  })

  it('removeHabit deletes a free habit', async () => {
    const h = mk('a', 'A')
    await db.habits.add(h)
    expect(await removeHabit(h)).toEqual({ ok: true })
    expect(await db.habits.get('a')).toBeUndefined()
  })

  it('removeHabit reports habits that use it as reducer', async () => {
    const reducer = mk('r', 'R')
    await db.habits.bulkAdd([reducer, mk('x', 'X', { perDay: 1, reducedByDaysOf: 'r' })])
    expect(await removeHabit(reducer)).toEqual({ ok: false, names: '«X»' })
    expect(await db.habits.get('r')).toBeDefined()
  })
})
