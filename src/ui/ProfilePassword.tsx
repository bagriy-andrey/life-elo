import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { strength, validate, type AuthErrors, type AuthField, type AuthForm } from '../auth/validation'
import { Button, Card, Notice, PasswordField } from './components'
import './auth/AuthScreen.css'
import './ProfilePassword.css'

export function ProfilePassword({ onBack }: { onBack: () => void }) {
  const { user, googleOnly, changePassword, setPassword } = useAuth()
  const [form, setForm] = useState<AuthForm>({})
  const [touched, setTouched] = useState<Partial<Record<AuthField, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [currentError, setCurrentError] = useState('')
  const [success, setSuccess] = useState('')
  const [forgotHint, setForgotHint] = useState(false)

  const errors: AuthErrors = validate('change', form, googleOnly)
  const shown = (f: AuthField) => (submitted || touched[f] ? errors[f] : undefined)
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
    if ('wrongCurrent' in r && r.wrongCurrent) return setCurrentError(r.error ?? '')
    if (r.error) return setFormError(r.error)
    setForm({})
    setTouched({})
    setSubmitted(false)
    setSuccess(
      googleOnly
        ? 'Пароль задан. Теперь можно входить и по почте.'
        : 'Пароль изменён. На других устройствах нужно будет войти заново.',
    )
  }

  const title = googleOnly ? 'Задать пароль' : 'Смена пароля'
  const currentShown = currentError || shown('current')

  return (
    <section className="profile-password">
      <div className="profile-password-head">
        <button type="button" className="profile-password-back" aria-label="Назад" onClick={onBack}>
          ‹
        </button>
        <h2>{title}</h2>
      </div>
      {success && <Notice tone="success">{success}</Notice>}
      {formError && <Notice tone="error">{formError}</Notice>}
      {googleOnly && (
        <Card>
          <div className="stack-sm">
            <strong>Вход через Google</strong>
            <span className="muted">
              У аккаунта пока нет пароля. Задайте его, чтобы входить и по почте {user?.email}.
            </span>
          </div>
        </Card>
      )}
      <Card>
        <form className="auth-form" noValidate onSubmit={submit}>
          {!googleOnly && (
            <PasswordField
              label="Текущий пароль"
              autoComplete="current-password"
              value={form.current ?? ''}
              onChange={set('current')}
              onBlur={blur('current')}
              error={currentShown}
              {...pwProps}
            />
          )}
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
            label="Повторите новый пароль"
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
      </Card>
      {!googleOnly && (
        <>
          <button type="button" className="auth-link" onClick={() => setForgotHint(true)}>
            Не помню текущий пароль
          </button>
          {forgotHint && (
            <span className="muted">Выйдите из аккаунта и нажмите «Забыли пароль?» на экране входа.</span>
          )}
        </>
      )}
    </section>
  )
}
