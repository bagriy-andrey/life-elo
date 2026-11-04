import { useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { strength, validate, type AuthErrors, type AuthField, type AuthForm } from '../../auth/validation'
import { Button, Notice, PasswordField, TextField } from '../components'
import './AuthScreen.css'

type Mode = 'login' | 'register' | 'forgot'

const COPY: Record<Mode, { title: string; subtitle: string; submit: string; ask: string; switchTo: Mode; switchLabel: string }> = {
  login: {
    title: 'Вход',
    subtitle: 'Рады снова видеть. Продолжим считать рейтинг.',
    submit: 'Войти',
    ask: 'Нет аккаунта?',
    switchTo: 'register',
    switchLabel: 'Зарегистрироваться',
  },
  register: {
    title: 'Регистрация',
    subtitle: 'Аккаунт сохранит привычки и рейтинг на всех устройствах.',
    submit: 'Создать аккаунт',
    ask: 'Уже есть аккаунт?',
    switchTo: 'login',
    switchLabel: 'Войти',
  },
  forgot: {
    title: 'Восстановление пароля',
    subtitle: 'Пришлём ссылку для нового пароля на вашу почту.',
    submit: 'Отправить ссылку',
    ask: 'Вспомнили?',
    switchTo: 'login',
    switchLabel: 'Войти',
  },
}

export function AuthLogo() {
  return (
    <div className="auth-logo">
      <div className="auth-logo-mark">Elo</div>
      <strong className="auth-logo-name">Life Elo</strong>
    </div>
  )
}

export function AuthScreen({ initialMode = 'login' }: { initialMode?: Mode }) {
  const auth = useAuth()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [form, setForm] = useState<AuthForm>({})
  const [touched, setTouched] = useState<Partial<Record<AuthField, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [resent, setResent] = useState(false)

  const copy = COPY[mode]
  const errors: AuthErrors = validate(mode, form)
  const shown = (f: AuthField) => (submitted || touched[f] ? errors[f] : undefined)
  const set = (f: AuthField) => (e: { target: { value: string } }) => {
    setForm((p) => ({ ...p, [f]: e.target.value }))
    setFormError('')
  }
  const blur = (f: AuthField) => () => setTouched((p) => ({ ...p, [f]: true }))

  const switchMode = (next: Mode) => {
    setMode(next)
    setForm((p) => ({ email: p.email }))
    setTouched({})
    setSubmitted(false)
    setFormError('')
    setSentTo('')
    setResent(false)
    setVisible(false)
  }

  const email = (form.email ?? '').trim()

  const send = async (again: boolean) => {
    setBusy(true)
    setFormError('')
    const r = await auth.resetPassword(email)
    setBusy(false)
    if (r.error) return setFormError(r.error)
    setSentTo(email)
    setResent(again)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setSubmitted(true)
    if (Object.keys(errors).length) return
    if (mode === 'forgot') return send(false)
    setBusy(true)
    setFormError('')
    const r =
      mode === 'login'
        ? await auth.signIn(email, form.password ?? '')
        : await auth.signUp((form.name ?? '').trim(), email, form.password ?? '')
    setBusy(false)
    if (r.error) setFormError(r.error)
  }

  const google = async () => {
    setBusy(true)
    setFormError('')
    const r = await auth.google()
    if (r.error) {
      setBusy(false)
      setFormError(r.error)
    }
  }

  const done = mode === 'forgot' && sentTo !== ''
  const pwProps = { visible, onToggleVisible: () => setVisible((v) => !v) }

  return (
    <div className="auth">
      <AuthLogo />
      <div className="auth-head">
        <h1 className="auth-title">{copy.title}</h1>
        <p className="auth-subtitle">{copy.subtitle}</p>
      </div>

      {done && (
        <Notice tone="success">
          {resent ? `Отправили ещё раз на ${sentTo}` : `Письмо отправлено на ${sentTo}. Ссылка действует 1 час.`}
        </Notice>
      )}
      {formError && <Notice tone="error">{formError}</Notice>}

      {mode !== 'forgot' && (
        <>
          <button type="button" className="auth-google" onClick={google} disabled={busy}>
            <span className="auth-google-badge" aria-hidden="true">G</span>
            {mode === 'login' ? 'Войти через Google' : 'Продолжить с Google'}
          </button>
          <div className="auth-divider">или по почте</div>
        </>
      )}

      {done ? (
        <Button className="auth-submit" disabled={busy} onClick={() => send(true)}>
          {busy ? 'Подождите…' : 'Отправить ещё раз'}
        </Button>
      ) : (
        <form className="auth-form" noValidate onSubmit={submit}>
          {mode === 'register' && (
            <TextField
              label="Имя"
              placeholder="Как вас зовут"
              autoComplete="name"
              value={form.name ?? ''}
              onChange={set('name')}
              onBlur={blur('name')}
              error={shown('name')}
            />
          )}
          <TextField
            label="Почта"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email ?? ''}
            onChange={set('email')}
            onBlur={blur('email')}
            error={shown('email')}
          />
          {mode !== 'forgot' && (
            <div className="auth-pw">
              <PasswordField
                label="Пароль"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder={mode === 'register' ? 'Минимум 8 символов' : undefined}
                value={form.password ?? ''}
                onChange={set('password')}
                onBlur={blur('password')}
                error={shown('password')}
                strength={mode === 'register' ? (strength(form.password ?? '') as 0 | 1 | 2 | 3) : undefined}
                {...pwProps}
              />
              {mode === 'login' && (
                <button type="button" className="auth-link auth-forgot" onClick={() => switchMode('forgot')}>
                  Забыли пароль?
                </button>
              )}
            </div>
          )}
          {mode === 'register' && (
            <PasswordField
              label="Повторите пароль"
              autoComplete="new-password"
              value={form.confirm ?? ''}
              onChange={set('confirm')}
              onBlur={blur('confirm')}
              error={shown('confirm')}
              {...pwProps}
            />
          )}
          <Button variant="primary" type="submit" className="auth-submit" disabled={busy}>
            {busy ? 'Подождите…' : copy.submit}
          </Button>
        </form>
      )}

      <div className="auth-footer">
        <span>{copy.ask}</span>
        <button type="button" className="auth-link" onClick={() => switchMode(copy.switchTo)}>
          {copy.switchLabel}
        </button>
      </div>
    </div>
  )
}
