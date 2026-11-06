import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { strength, validate, type AuthErrors, type AuthField, type AuthForm } from '../auth/validation'
import { useI18n } from '../i18n'
import type { Key } from '../i18n/types'
import { Button, Card, Notice, PasswordField } from './components'
import { usePasswordLabels } from './auth/passwordLabels'
import './auth/AuthScreen.css'
import './ProfilePassword.css'

export function ProfilePassword({ onBack }: { onBack: () => void }) {
  const { t } = useI18n()
  const pwLabels = usePasswordLabels()
  const { user, googleOnly, changePassword, setPassword } = useAuth()
  const [form, setForm] = useState<AuthForm>({})
  const [touched, setTouched] = useState<Partial<Record<AuthField, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<Key | ''>('')
  const [currentError, setCurrentError] = useState<Key | ''>('')
  const [success, setSuccess] = useState<Key | ''>('')
  const [forgotHint, setForgotHint] = useState(false)

  const errors: AuthErrors = validate('change', form, googleOnly)
  const shown = (f: AuthField) => (submitted || touched[f] ? errors[f] : undefined)
  const shownText = (f: AuthField) => {
    const k = shown(f)
    return k ? t(k) : undefined
  }
  const set = (f: AuthField) => (e: { target: { value: string } }) => {
    setForm((p) => ({ ...p, [f]: e.target.value }))
    setFormError('')
    setSuccess('')
    if (f === 'current') setCurrentError('')
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
    setSuccess('')
    const next = form.password ?? ''
    const r = googleOnly ? await setPassword(next) : await changePassword(form.current ?? '', next)
    setBusy(false)
    if ('wrongCurrent' in r && r.wrongCurrent) return setCurrentError(r.error ?? 'authError.wrongCurrent')
    if (r.error) return setFormError(r.error)
    setForm({})
    setTouched({})
    setSubmitted(false)
    setSuccess(googleOnly ? 'password.setDone' : 'password.changeDone')
  }

  const title = googleOnly ? t('password.set') : t('password.change')
  const currentShown = currentError ? t(currentError) : shownText('current')

  return (
    <section className="profile-password">
      <div className="profile-password-head">
        <button type="button" className="profile-password-back" aria-label={t('password.back')} onClick={onBack}>
          ‹
        </button>
        <h2>{title}</h2>
      </div>
      {success && <Notice tone="success">{t(success)}</Notice>}
      {formError && <Notice tone="error">{t(formError)}</Notice>}
      {googleOnly && (
        <Card>
          <div className="stack-sm">
            <strong>{t('password.googleTitle')}</strong>
            <span className="muted">
              {t('password.googleBody', { email: user?.email ?? '' })}
            </span>
          </div>
        </Card>
      )}
      <Card>
        <form className="auth-form" noValidate onSubmit={submit}>
          {!googleOnly && (
            <PasswordField
              label={t('password.current')}
              autoComplete="current-password"
              value={form.current ?? ''}
              onChange={set('current')}
              onBlur={blur('current')}
              error={currentShown}
              {...pwProps}
              {...pwLabels}
            />
          )}
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
            label={t('password.confirmNew')}
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
      </Card>
      {!googleOnly && (
        <>
          <button type="button" className="auth-link" onClick={() => setForgotHint(true)}>
            {t('password.forgot')}
          </button>
          {forgotHint && (
            <span className="muted">{t('password.forgotHint')}</span>
          )}
        </>
      )}
    </section>
  )
}
