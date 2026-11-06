import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { AUTH_FALLBACK } from '../auth/errors'
import { db } from '../db/db'
import { useI18n, type I18n } from '../i18n'
import type { Key } from '../i18n/types'
import { useSyncStatus, type SyncEngine, type SyncStatus } from '../sync/engine'
import { performLogout } from '../sync/logout'
import { clearLocalData } from '../sync/outbox'
import { Button, Card, Notice } from './components'
import './auth/AuthScreen.css'

function formatSynced(at: number, t: I18n['t'], locale: string, now = new Date()): string {
  const d = new Date(at)
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return t('sync.syncedAt', { time })
  const date = d.toLocaleDateString(locale, { day: 'numeric', month: 'short' }).replace(/\.$/, '')
  return t('sync.syncedOn', { date, time })
}

function statusText(s: SyncStatus, t: I18n['t'], locale: string): string {
  switch (s.kind) {
    case 'syncing':
      return t('sync.syncing')
    case 'offline':
      return t('sync.offline')
    case 'error':
      return t('sync.error')
    case 'update-required':
      return t('sync.updateRequired')
    default:
      return s.lastSyncedAt ? formatSynced(s.lastSyncedAt, t, locale) : t('sync.never')
  }
}

interface Props {
  engine: SyncEngine
  onPassword: () => void
}

/** Account block of the profile tab: sign-in identity, sync status, password, logout. */
export function Account({ engine, onPassword }: Props) {
  const { user, googleOnly, signOut } = useAuth()
  const { t, locale } = useI18n()
  const status = useSyncStatus()
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<Key | ''>('')

  const email = user?.email ?? ''

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
      setError(AUTH_FALLBACK)
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
      setError(AUTH_FALLBACK)
      setBusy(false)
    }
  }

  return (
    <section className="stack">
      <h2>{t('account.title')}</h2>
      <Card>
        <div className="stack-sm">
          <span className="muted">{email}</span>
          <span>{statusText(status, t, locale)}</span>
          {status.kind === 'error' && <Button onClick={() => void engine.run()}>{t('sync.retry')}</Button>}
          <button type="button" className="auth-link" onClick={() => void engine.resync()}>
            {t('account.resync')}
          </button>
        </div>
      </Card>
      {error && <Notice tone="error">{t(error)}</Notice>}
      <Button onClick={onPassword}>{googleOnly ? t('password.set') : t('account.changePassword')}</Button>
      {confirming ? (
        <Card>
          <div className="stack-sm">
            <p>{t('account.unsynced')}</p>
            <Button variant="primary" disabled={busy} onClick={confirmLogout}>
              {busy ? t('auth.busy') : t('account.logout')}
            </Button>
            <Button disabled={busy} onClick={() => setConfirming(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </Card>
      ) : (
        <Button disabled={busy} onClick={logout}>
          {busy ? t('auth.busy') : t('account.logout')}
        </Button>
      )}
    </section>
  )
}
