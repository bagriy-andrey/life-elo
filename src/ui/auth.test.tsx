import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { syncStatusStore, type SyncEngine } from '../sync/engine'
import { AccountActions, AccountSection } from './Account'
import { AuthScreen } from './auth/AuthScreen'
import { NewPassword } from './auth/NewPassword'
import { withAuth } from './authTestUtils'
import { ProfilePassword } from './ProfilePassword'

const engine = { run: async () => {}, resync: async () => {} } as unknown as SyncEngine

describe('auth screens smoke render', () => {
  it('AuthScreen modes render their titles', () => {
    expect(renderToString(withAuth(<AuthScreen />))).toContain('Вход')
    expect(renderToString(withAuth(<AuthScreen initialMode="register" />))).toContain('Регистрация')
    expect(renderToString(withAuth(<AuthScreen initialMode="forgot" />))).toContain('Восстановление пароля')
  })

  it('NewPassword ready / invalid / done', () => {
    const r = (recovery: 'ready' | 'invalid' | 'done') =>
      renderToString(withAuth(<NewPassword onRequestNew={() => {}} />, { recovery }))
    expect(r('ready')).toContain('Придумайте новый пароль')
    expect(r('invalid')).toContain('Ссылка устарела')
    expect(r('done')).toContain('Пароль изменён')
  })


  it('ProfilePassword googleOnly true / false', () => {
    const g = renderToString(withAuth(<ProfilePassword onBack={() => {}} />, { googleOnly: true }))
    const p = renderToString(withAuth(<ProfilePassword onBack={() => {}} />, { googleOnly: false }))
    expect(g).toContain('Задать пароль')
    expect(p).toContain('Смена пароля')
    expect(p).not.toContain('Задать пароль')
  })
})

describe('Account smoke render', () => {
  afterEach(() => syncStatusStore.set({ kind: 'idle', lastSyncedAt: undefined }))
  const render = () => renderToString(withAuth(
      <>
        <h2>Аккаунт</h2>
        <AccountSection engine={engine} />
        <AccountActions engine={engine} onPassword={() => {}} />
      </>,
    ))

  it('shows email, heading and status for idle / offline / error', () => {
    let html = render()
    expect(html).toContain('a@b.co')
    expect(html).toContain('Аккаунт')
    expect(html).toContain('Ещё не синхронизировано')
    expect(html).not.toContain('auth-link')
    syncStatusStore.set({ kind: 'offline' })
    expect(render()).toContain('Нет сети')
    syncStatusStore.set({ kind: 'error' })
    html = render()
    expect(html).toContain('Ошибка синхронизации')
    expect(html).toContain('Синхронизировать заново')
  })
})
