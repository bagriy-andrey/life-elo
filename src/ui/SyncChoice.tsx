import { useState } from 'react'
import { AUTH_FALLBACK } from '../auth/errors'
import { useI18n } from '../i18n'
import type { Key } from '../i18n/types'
import { Button, Card, Notice } from './components'
import { AuthLogo } from './auth/AuthScreen'
import './auth/AuthScreen.css'

export type SyncChoiceKind = 'account' | 'device'

const OPTIONS: Record<SyncChoiceKind, { title: Key; hint: Key; confirm: Key }> = {
  account: {
    title: 'sync.choice.account',
    hint: 'sync.choice.accountHint',
    confirm: 'sync.choice.accountConfirm',
  },
  device: {
    title: 'sync.choice.device',
    hint: 'sync.choice.deviceHint',
    confirm: 'sync.choice.deviceConfirm',
  },
}

export function SyncChoice({ onChoose }: { onChoose: (kind: SyncChoiceKind) => Promise<void> }) {
  const { t } = useI18n()
  const [pending, setPending] = useState<SyncChoiceKind | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<Key | ''>('')

  const confirm = async () => {
    if (!pending || busy) return
    setBusy(true)
    setError('')
    try {
      await onChoose(pending)
    } catch {
      setError(AUTH_FALLBACK)
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <AuthLogo />
      <div className="auth-head">
        <h1 className="auth-title">{t('sync.choice.title')}</h1>
        <p className="auth-subtitle">{t('sync.choice.subtitle')}</p>
      </div>
      {error && <Notice tone="error">{t(error)}</Notice>}
      {pending ? (
        <Card>
          <p className="auth-subtitle">{t('sync.choice.warn', { hint: t(OPTIONS[pending].hint) })}</p>
          <Button variant="primary" className="auth-submit" disabled={busy} onClick={confirm}>
            {busy ? t('auth.busy') : t(OPTIONS[pending].confirm)}
          </Button>
          <Button className="auth-submit" disabled={busy} onClick={() => setPending(null)}>
            {t('common.cancel')}
          </Button>
        </Card>
      ) : (
        (['account', 'device'] as const).map((k) => (
          <Card key={k}>
            <Button className="auth-submit" onClick={() => setPending(k)}>
              {t(OPTIONS[k].title)}
            </Button>
            <p className="auth-muted">{t(OPTIONS[k].hint)}</p>
          </Card>
        ))
      )}
    </div>
  )
}
