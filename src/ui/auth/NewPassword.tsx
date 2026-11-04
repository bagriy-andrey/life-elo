import { useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { strength, validate, type AuthField, type AuthForm } from '../../auth/validation'
import { Button, Notice, PasswordField } from '../components'
import { AuthLogo } from './AuthScreen'
import './AuthScreen.css'

export function NewPassword({ onRequestNew }: { onRequestNew: () => void }) {
  const auth = useAuth()
  const [form, setForm] = useState<AuthForm>({})
  const [touched, setTouched] = useState<Partial<Record<AuthField, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  const errors = validate('recovery', form)
  const shown = (f: AuthField) => (submitted || touched[f] ? errors[f] : undefined)
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
        <p className="auth-muted">Проверяем ссылку…</p>
      </div>
    )

  return (
    <div className="auth">
      <AuthLogo />
      <div className="auth-head">
        <h1 className="auth-title">Новый пароль</h1>
        {state === 'ready' && <p className="auth-subtitle">Придумайте новый пароль для входа.</p>}
      </div>

      {state === 'invalid' && (
        <>
          <Notice tone="error">Ссылка устарела или уже использована. Запросите новую.</Notice>
          <Button
            variant="primary"
            className="auth-submit"
            onClick={() => {
              onRequestNew()
              auth.dismissRecovery()
            }}
          >
            Запросить новую ссылку
          </Button>
        </>
      )}

      {state === 'done' && (
        <>
          <Notice tone="success">Пароль изменён. Войдите в приложении с новым паролем.</Notice>
          <Button variant="primary" className="auth-submit" onClick={auth.dismissRecovery}>
            Ко входу
          </Button>
        </>
      )}

      {state === 'ready' && (
        <>
          {formError && <Notice tone="error">{formError}</Notice>}
          <form className="auth-form" noValidate onSubmit={submit}>
            <PasswordField
              label="Новый пароль"
              autoComplete="new-password"
              placeholder="Минимум 8 символов"
              value={form.password ?? ''}
              onChange={set('password')}
              onBlur={blur('password')}
              error={shown('password')}
              strength={strength(form.password ?? '') as 0 | 1 | 2 | 3}
              {...pwProps}
            />
            <PasswordField
              label="Повторите пароль"
              autoComplete="new-password"
              value={form.confirm ?? ''}
              onChange={set('confirm')}
              onBlur={blur('confirm')}
              error={shown('confirm')}
              {...pwProps}
            />
            <Button variant="primary" type="submit" className="auth-submit" disabled={busy}>
              {busy ? 'Подождите…' : 'Сохранить пароль'}
            </Button>
          </form>
          <div className="auth-footer">
            <span>Вспомнили?</span>
            <button type="button" className="auth-link" onClick={auth.dismissRecovery}>
              Войти
            </button>
          </div>
        </>
      )}
    </div>
  )
}
