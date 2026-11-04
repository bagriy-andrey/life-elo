import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { AUTH_FALLBACK_TEXT } from '../auth/errors'
import { db } from '../db/db'
import { useSyncStatus, type SyncEngine, type SyncStatus } from '../sync/engine'
import { performLogout } from '../sync/logout'
import { clearLocalData } from '../sync/outbox'
import { Button, Card, Notice } from './components'
import './auth/AuthScreen.css'

function formatSynced(at: number, now = new Date()): string {
  const d = new Date(at)
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return `Синхронизировано · ${time}`
  const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace(/\.$/, '')
  return `Синхронизировано · ${date}, ${time}`
}

function statusText(s: SyncStatus): string {
  switch (s.kind) {
    case 'syncing':
      return 'Синхронизация…'
    case 'offline':
      return 'Нет сети — изменения сохранены на устройстве'
    case 'error':
      return 'Ошибка синхронизации'
    case 'update-required':
      return 'Обновите приложение, чтобы продолжить синхронизацию'
    default:
      return s.lastSyncedAt ? formatSynced(s.lastSyncedAt) : 'Ещё не синхронизировано'
  }
}

interface Props {
  engine: SyncEngine
  onPassword: () => void
}

export function Profile({ engine, onPassword }: Props) {
  const { user, googleOnly, signOut } = useAuth()
  const status = useSyncStatus()
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  const email = user?.email ?? ''
  const meta = user?.user_metadata as { name?: string; full_name?: string } | undefined
  const name = meta?.name || meta?.full_name || email.split('@')[0]

  /** Only explicit logout clears local data (never on a SIGNED_OUT event). */
  const finish = async () => {
    const out = await performLogout({ engine, signOut, clearLocalData })
    if (!out.ok) throw new Error('logout failed')
  }

  const logout = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await engine.run()
      if ((await db.outbox.count()) > 0) {
        setConfirming(true)
        setBusy(false)
        return
      }
      await finish()
    } catch {
      setError(AUTH_FALLBACK_TEXT)
      setBusy(false)
    }
  }

  const confirmLogout = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await finish()
    } catch {
      setError(AUTH_FALLBACK_TEXT)
      setBusy(false)
    }
  }

  return (
    <section className="stack">
      <h2>Профиль</h2>
      <Card>
        <div className="stack-sm">
          <strong>{name}</strong>
          <span className="muted">{email}</span>
        </div>
      </Card>
      <Card>
        <div className="stack-sm">
          <span>{statusText(status)}</span>
          {status.kind === 'error' && <Button onClick={() => void engine.run()}>Повторить</Button>}
          <button type="button" className="auth-link" onClick={() => void engine.resync()}>
            Синхронизировать заново
          </button>
        </div>
      </Card>
      {error && <Notice tone="error">{error}</Notice>}
      <Button onClick={onPassword}>{googleOnly ? 'Задать пароль' : 'Сменить пароль'}</Button>
      {confirming ? (
        <Card>
          <div className="stack-sm">
            <p>Есть несинхронизированные изменения. Если выйти, они пропадут.</p>
            <Button variant="primary" disabled={busy} onClick={confirmLogout}>
              {busy ? 'Подождите…' : 'Выйти'}
            </Button>
            <Button disabled={busy} onClick={() => setConfirming(false)}>
              Отмена
            </Button>
          </div>
        </Card>
      ) : (
        <Button disabled={busy} onClick={logout}>
          {busy ? 'Подождите…' : 'Выйти'}
        </Button>
      )}
    </section>
  )
}
