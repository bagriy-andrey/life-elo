import { describe, expect, it } from 'vitest'
import { applyDecision, schemaGate, toPushItem } from './merge'

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
