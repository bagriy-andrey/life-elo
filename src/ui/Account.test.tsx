import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { syncStatusStore, type SyncEngine } from '../sync/engine'
import { AccountSection } from './Account'
import { withAuth } from './authTestUtils'

const engine = { resync: async () => {}, run: async () => {} } as unknown as SyncEngine
const emailUser = { email: 'a@b.co', identities: [{ provider: 'email' }] } as never
const googleUser = { email: 'g@b.co', identities: [{ provider: 'google' }] } as never

describe('AccountSection login email', () => {
  it('email/password user can change the email; dialog is closed', () => {
    const html = renderToString(withAuth(<AccountSection engine={engine} />, { user: emailUser }))
    expect(html).toContain('Сменить')
    expect(html).toContain('a@b.co')
    expect(html).not.toContain('Вход через Google')
    expect(html).not.toContain('alertdialog')
  })
  it('Google-only user sees the caption and no change action', () => {
    const html = renderToString(withAuth(<AccountSection engine={engine} />, { user: googleUser, googleOnly: true }))
    expect(html).toContain('Вход через Google')
    expect(html).not.toContain('Сменить')
    expect(html).toContain('g@b.co')
  })
})

describe('AccountSection sync row', () => {
  it('has no sync status row while idle', () => {
    const html = renderToString(withAuth(<AccountSection engine={engine} />, { user: emailUser }))
    expect(html).not.toContain('Синхронизация')
    expect(html).not.toContain('Синхронизировано')
    expect(html).not.toContain('sync-btn')
  })
  it('shows a notice and resync only on error', () => {
    syncStatusStore.set({ kind: 'error' })
    try {
      const html = renderToString(withAuth(<AccountSection engine={engine} />, { user: emailUser }))
      expect(html).toContain('Ошибка синхронизации')
      expect(html).toContain('Синхронизировать заново')
    } finally {
      syncStatusStore.set({ kind: 'idle' })
    }
  })
})
