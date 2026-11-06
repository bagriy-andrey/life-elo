import { useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/context'
import { strength, validate, type AuthField, type AuthForm } from '../../auth/validation'
import { useI18n } from '../../i18n'
import type { Key } from '../../i18n/types'
import { Button, Notice, PasswordField } from '../components'
import { AuthLogo } from './AuthScreen'
import { usePasswordLabels } from './passwordLabels'
import './AuthScreen.css'

export function NewPassword({ onRequestNew }: { onRequestNew: () => void }) {
  const auth = useAuth()
  const { t } = useI18n()
  const pwLabels = usePasswordLabels()
  const [form, setForm] = useState<AuthForm>({})
  const [touched, setTouched] = useState<Partial<Record<AuthField, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<Key | ''>('')

  const errors = validate('recovery', form)
  const shown = (f: AuthField) => (submitted || touched[f] ? errors[f] : undefined)
  const shownText = (f: AuthField) => {
    const k = shown(f)
    return k ? t(k) : undefined
  }
  const set = (f: AuthField) => (e: { target: { value: string } }) => {
    setForm((p) => ({ ...p, [f]: e.target.value }))
    setFormError('')
  }
  const blur = (f: AuthField) => () => setTouched((p) => ({ ...p, [f]: true }))
  const pwProps = { visible, onToggleVisible: () => setVisible((v) => !v) }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setSubmitted(true)
    if (Object.keys(errors).length) return
    setBusy(true)
    setFormError('')
    const r = await auth.setNewPassword(form.password ?? '')
    setBusy(false)
    if (r.error) setFormError(r.error)
  }

  const state = auth.recovery
  if (state === 'verifying')
    return (
      <div className="auth">
        <AuthLogo />
        <p className="auth-muted">{t('auth.verifying')}</p>
      </div>
    )

  return (
    <div className="auth">
      <AuthLogo />
      <div className="auth-head">
        <h1 className="auth-title">{t('auth.newPassword.title')}</h1>
        {state === 'ready' && <p className="auth-subtitle">{t('auth.newPassword.subtitle')}</p>}
      </div>

      {state === 'invalid' && (
        <>
          <Notice tone="error">{t('authError.expired')}</Notice>
          <Button
            variant="primary"
            className="auth-submit"
            onClick={() => {
              onRequestNew()
              auth.dismissRecovery()
            }}
          >
            {t('auth.newPassword.requestNew')}
          </Button>
        </>
      )}

      {state === 'done' && (
        <>
          <Notice tone="success">{t('auth.newPassword.done')}</Notice>
          <Button variant="primary" className="auth-submit" onClick={auth.dismissRecovery}>
            {t('auth.newPassword.toLogin')}
          </Button>
        </>
      )}

      {state === 'ready' && (
        <>
          {formError && <Notice tone="error">{t(formError)}</Notice>}
          <form className="auth-form" noValidate onSubmit={submit}>
            <PasswordField
              label={t('auth.newPassword.title')}
              autoComplete="new-password"
              placeholder={t('password.placeholder')}
              value={form.password ?? ''}
              onChange={set('password')}
              onBlur={blur('password')}
              error={shownText('password')}
              strength={strength(form.password ?? '') as 0 | 1 | 2 | 3}
              {...pwProps}
              {...pwLabels}
            />
            <PasswordField
              label={t('auth.confirm')}
              autoComplete="new-password"
              value={form.confirm ?? ''}
              onChange={set('confirm')}
              onBlur={blur('confirm')}
              error={shownText('confirm')}
              {...pwProps}
              {...pwLabels}
            />
            <Button variant="primary" type="submit" className="auth-submit" disabled={busy}>
              {busy ? t('auth.busy') : t('auth.newPassword.save')}
            </Button>
          </form>
          <div className="auth-footer">
            <span>{t('auth.forgot.ask')}</span>
            <button type="button" className="auth-link" onClick={auth.dismissRecovery}>
              {t('auth.login.submit')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
