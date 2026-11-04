import { describe, expect, it } from 'vitest'
import { applyDecision, firstSignInMode, schemaGate, toPushItem } from './merge'

const remote = { client_updated_at: '2026-01-01T00:00:00.000Z' }
const t = Date.parse(remote.client_updated_at)

describe('applyDecision', () => {
  it('applies when no outbox entry', () => expect(applyDecision(remote, undefined)).toBe('apply'))
  it('keeps local when outbox is newer', () =>
    expect(applyDecision(remote, { changedAt: t + 1 })).toBe('keep-local'))
  it('applies on tie', () => expect(applyDecision(remote, { changedAt: t })).toBe('apply'))
  it('applies when outbox is older', () => expect(applyDecision(remote, { changedAt: t - 1 })).toBe('apply'))
})

describe('schemaGate', () => {
  it('ok / migrate / update-app', () => {
    expect(schemaGate(3, 3)).toBe('ok')
    expect(schemaGate(2, 3)).toBe('migrate')
    expect(schemaGate(4, 3)).toBe('update-app')
  })
})

describe('firstSignInMode', () => {
  const base = { syncedUserId: undefined, userId: 'u', localCount: 1, remoteCount: 1 }
  it('none for the same user', () => expect(firstSignInMode({ ...base, syncedUserId: 'u' })).toBe('none'))
  it('upload when remote is empty (even if local is empty)', () => {
    expect(firstSignInMode({ ...base, remoteCount: 0 })).toBe('upload')
    expect(firstSignInMode({ ...base, remoteCount: 0, localCount: 0 })).toBe('upload')
  })
  it('pull when local is empty', () => expect(firstSignInMode({ ...base, localCount: 0 })).toBe('pull'))
  it('ask when both have data, also for a different previous user', () => {
    expect(firstSignInMode(base)).toBe('ask')
    expect(firstSignInMode({ ...base, syncedUserId: 'other' })).toBe('ask')
  })
})

describe('toPushItem', () => {
  it('serializes a row', () => {
    expect(toPushItem('habits', 'a', { id: 'a' }, 0, 3)).toEqual({
      tbl: 'habits', key: 'a', data: { id: 'a' }, deleted: false, schema: 3,
      client_updated_at: '1970-01-01T00:00:00.000Z',
    })
  })
  it('makes a tombstone for a missing row', () => {
    expect(toPushItem('habits', 'a', undefined, 1000, 3)).toMatchObject({
      data: null, deleted: true, client_updated_at: '1970-01-01T00:00:01.000Z',
    })
  })
})
