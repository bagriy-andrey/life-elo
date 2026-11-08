import { useState } from 'react'
import { useAuth } from '../auth/context'
import { AUTH_FALLBACK } from '../auth/errors'
import { db } from '../db/db'
import { useI18n } from '../i18n'
import type { Key } from '../i18n/types'
import { useSyncStatus, type SyncEngine } from '../sync/engine'
import { performLogout } from '../sync/logout'
import { clearLocalData } from '../sync/outbox'
import { Button, Card, Notice } from './components'
import { syncView } from './syncView'
import './Profile.css'

/** Account rows: login email + sync status with a round resync button. */
export function AccountSection({ engine }: { engine: SyncEngine }) {
  const { user } = useAuth()
  const { t, locale } = useI18n()
  const status = useSyncStatus()
  const { tone, label } = syncView(status, t, locale)
  const syncing = status.kind === 'syncing'
  return (
    <Card className="profile-rows">
      <div className="profile-row">
        <span className="muted">{t('account.loginEmail')}</span>
        <span className="profile-row-value">{user?.email || '—'}</span>
      </div>
      <div className="profile-row">
        <span className="muted">{t('account.sync')}</span>
        <span className="sync-row">
          <span className={`sync-dot ${tone}`} aria-hidden="true" />
          <span className="profile-row-value">{label}</span>
          <button
            type="button"
            className={`sync-btn${syncing ? ' spinning' : ''}`}
            aria-label={t('account.resync')}
            disabled={syncing}
            onClick={() => void engine.resync()}
          >
            ↻
          </button>
        </span>
      </div>
    </Card>
  )
}

/** Password + logout buttons (logout confirms when changes are unsynced). */
export function AccountActions({ engine, onPassword }: { engine: SyncEngine; onPassword: () => void }) {
  const { googleOnly, signOut } = useAuth()
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<Key | ''>('')

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
    <div className="stack">
      {error && <Notice tone="error">{t(error)}</Notice>}
      <Button className="clear-btn" onClick={onPassword}>
        {googleOnly ? t('password.set') : t('account.changePassword')}
      </Button>
      {confirming ? (
        <Card>
          <div className="stack-sm">
            <p>{t('account.unsynced')}</p>
            <Button variant="primary" className="clear-btn" disabled={busy} onClick={confirmLogout}>
              {busy ? t('auth.busy') : t('account.logout')}
            </Button>
            <Button className="clear-btn" disabled={busy} onClick={() => setConfirming(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </Card>
      ) : (
        <Button className="clear-btn" disabled={busy} onClick={logout}>
          {busy ? t('auth.busy') : t('account.logout')}
        </Button>
      )}
    </div>
  )
}

interface Props {
  engine: SyncEngine
  onPassword: () => void
}

/** Account block of the profile tab (kept until the Profile rewrite). */
export function Account({ engine, onPassword }: Props) {
  const { t } = useI18n()
  return (
    <section className="stack">
      <h2 className="settings-title">{t('account.title')}</h2>
      <AccountSection engine={engine} />
      <AccountActions engine={engine} onPassword={onPassword} />
    </section>
  )
}
