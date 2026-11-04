import { describe, expect, it } from 'vitest'
import { buildProfile } from './profile'

const t0 = new Date(2026, 0, 1, 12)
const t1 = new Date(2026, 5, 1, 12)

describe('buildProfile', () => {
  it('creates with createdAt = now, trims, normalizes, drops empties', () => {
    const p = buildProfile(undefined, { name: '  Анна ', nick: ' @anna_1 ', email: ' ', birth: '' }, t0)
    expect(p).toEqual({ id: 'me', name: 'Анна', nick: 'anna_1', createdAt: t0.getTime() })
    expect('email' in p || 'birth' in p || 'photo' in p).toBe(false)
  })

  it('keeps createdAt and photo on later saves', () => {
    const first = buildProfile(undefined, { name: 'A', photo: 'data:x' }, t0)
    const second = buildProfile(first, { name: 'B', email: 'a@b.co', birth: '2000-02-29' }, t1)
    expect(second.createdAt).toBe(t0.getTime())
    expect(second).toMatchObject({ name: 'B', email: 'a@b.co', birth: '2000-02-29', photo: 'data:x' })
  })

  it('removes the photo with null and clears emptied optionals', () => {
    const first = buildProfile(undefined, { name: 'A', nick: 'abc', photo: 'data:x' }, t0)
    const next = buildProfile(first, { name: 'A', nick: '', photo: null }, t1)
    expect('photo' in next || 'nick' in next).toBe(false)
  })
})
