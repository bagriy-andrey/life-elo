import { useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/context'
import { strength, validate, type AuthErrors, type AuthField, type AuthForm } from '../../auth/validation'
import { useI18n } from '../../i18n'
import type { Key } from '../../i18n/types'
import { Button, Notice, Field, PasswordField, Spinner } from '../components'
import { usePasswordLabels } from './passwordLabels'
import './AuthScreen.css'

type Mode = 'login' | 'register' | 'forgot'

const COPY: Record<Mode, { title: Key; subtitle: Key; submit: Key; ask: Key; switchTo: Mode; switchLabel: Key }> = {
  login: {
    title: 'auth.login.title',
    subtitle: 'auth.login.subtitle',
    submit: 'auth.login.submit',
    ask: 'auth.login.ask',
    switchTo: 'register',
    switchLabel: 'auth.login.switch',
  },
  register: {
    title: 'auth.register.title',
    subtitle: 'auth.register.subtitle',
    submit: 'auth.register.submit',
    ask: 'auth.register.ask',
    switchTo: 'login',
    switchLabel: 'auth.login.submit',
  },
  forgot: {
    title: 'auth.forgot.title',
    subtitle: 'auth.forgot.subtitle',
    submit: 'auth.forgot.submit',
    ask: 'auth.forgot.ask',
    switchTo: 'login',
    switchLabel: 'auth.login.submit',
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
  const { t } = useI18n()
  const pwLabels = usePasswordLabels()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [form, setForm] = useState<AuthForm>({})
  const [touched, setTouched] = useState<Partial<Record<AuthField, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  // Google redirects away on success: keep its spinner until the page unloads.
  const [googleBusy, setGoogleBusy] = useState(false)
  const [formError, setFormError] = useState<Key | ''>('')
  const [sentTo, setSentTo] = useState('')
  const [resent, setResent] = useState(false)

  const copy = COPY[mode]
  const errors: AuthErrors = validate(mode, form)
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
    setGoogleBusy(true)
    setFormError('')
    const r = await auth.google()
    if (r.error) {
      setBusy(false)
      setGoogleBusy(false)
      setFormError(r.error)
    }
  }

  const done = mode === 'forgot' && sentTo !== ''
  const pwProps = { visible, onToggleVisible: () => setVisible((v) => !v) }

  return (
    <div className="auth">
      <AuthLogo />
      <div className="auth-head">
        <h1 className="auth-title">{t(copy.title)}</h1>
        <p className="auth-subtitle">{t(copy.subtitle)}</p>
      </div>

      {done && (
        <Notice tone="success">
          {resent ? t('auth.sentAgain', { email: sentTo }) : t('auth.sentTo', { email: sentTo })}
        </Notice>
      )}
      {formError && <Notice tone="error">{t(formError)}</Notice>}

      {mode !== 'forgot' && (
        <>
          <button type="button" className="auth-google" onClick={google} disabled={busy}>
            <span className="auth-google-badge" aria-hidden="true">
              {googleBusy ? <Spinner size={12} /> : 'G'}
            </span>
            {mode === 'login' ? t('auth.googleLogin') : t('auth.googleRegister')}
          </button>
          <div className="auth-divider">{t('auth.orEmail')}</div>
        </>
      )}

      {done ? (
        <Button className="auth-submit" loading={busy} onClick={() => send(true)}>
          {t('auth.resend')}
        </Button>
      ) : (
        <form className="auth-form" noValidate onSubmit={submit}>
          {mode === 'register' && (
            <Field label={t('profile.name')} error={shownText('name')}>
              <input
                placeholder={t('profile.namePlaceholder')}
                autoComplete="name"
                value={form.name ?? ''}
                onChange={set('name')}
                onBlur={blur('name')}
              />
            </Field>
          )}
          <Field label={t('profile.email')} error={shownText('email')}>
            <input
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email ?? ''}
              onChange={set('email')}
              onBlur={blur('email')}
            />
          </Field>
          {mode !== 'forgot' && (
            <div className="auth-pw">
              <PasswordField
                label={t('auth.password')}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder={mode === 'register' ? t('password.placeholder') : undefined}
                value={form.password ?? ''}
                onChange={set('password')}
                onBlur={blur('password')}
                error={shownText('password')}
                strength={mode === 'register' ? (strength(form.password ?? '') as 0 | 1 | 2 | 3) : undefined}
                {...pwProps}
                {...pwLabels}
              />
              {mode === 'login' && (
                <button type="button" className="auth-link auth-forgot" onClick={() => switchMode('forgot')}>
                  {t('auth.forgot.link')}
                </button>
              )}
            </div>
          )}
          {mode === 'register' && (
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
          )}
          <Button variant="primary" type="submit" className="auth-submit" loading={busy}>
            {t(copy.submit)}
          </Button>
        </form>
      )}

      <div className="auth-footer">
        <span>{t(copy.ask)}</span>
        <button type="button" className="auth-link" onClick={() => switchMode(copy.switchTo)}>
          {t(copy.switchLabel)}
        </button>
      </div>
    </div>
  )
}
