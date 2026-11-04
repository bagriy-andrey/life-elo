import { useState } from 'react'
import { AUTH_FALLBACK_TEXT } from '../auth/errors'
import { Button, Card, Notice } from './components'
import { AuthLogo } from './auth/AuthScreen'
import './auth/AuthScreen.css'

export type SyncChoiceKind = 'account' | 'device'

const OPTIONS: Record<SyncChoiceKind, { title: string; hint: string; confirm: string }> = {
  account: {
    title: 'Оставить данные аккаунта',
    hint: 'Данные на этом устройстве удалятся',
    confirm: 'Да, оставить данные аккаунта',
  },
  device: {
    title: 'Оставить данные устройства',
    hint: 'Данные в аккаунте заменятся данными с этого устройства',
    confirm: 'Да, оставить данные устройства',
  },
}

export function SyncChoice({ onChoose }: { onChoose: (kind: SyncChoiceKind) => Promise<void> }) {
  const [pending, setPending] = useState<SyncChoiceKind | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const confirm = async () => {
    if (!pending || busy) return
    setBusy(true)
    setError('')
    try {
      await onChoose(pending)
    } catch {
      setError(AUTH_FALLBACK_TEXT)
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <AuthLogo />
      <div className="auth-head">
        <h1 className="auth-title">На устройстве и в аккаунте есть данные</h1>
        <p className="auth-subtitle">Выберите, какую копию оставить. Другая будет удалена.</p>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {pending ? (
        <Card>
          <p className="auth-subtitle">{OPTIONS[pending].hint}. Это нельзя отменить.</p>
          <Button variant="primary" className="auth-submit" disabled={busy} onClick={confirm}>
            {busy ? 'Подождите…' : OPTIONS[pending].confirm}
          </Button>
          <Button className="auth-submit" disabled={busy} onClick={() => setPending(null)}>
            Отмена
          </Button>
        </Card>
      ) : (
        (['account', 'device'] as const).map((k) => (
          <Card key={k}>
            <Button className="auth-submit" onClick={() => setPending(k)}>
              {OPTIONS[k].title}
            </Button>
            <p className="auth-muted">{OPTIONS[k].hint}</p>
          </Card>
        ))
      )}
    </div>
  )
}
