import type { Key } from '../i18n/types'

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export type AuthScreen = 'login' | 'register' | 'forgot' | 'change' | 'recovery'
export type AuthField = 'name' | 'email' | 'password' | 'confirm' | 'current'
export type AuthForm = Partial<Record<AuthField, string>>
/** Values are i18n keys. */
export type AuthErrors = Partial<Record<AuthField, Key>>

const LETTER = /\p{L}/u
const DIGIT = /\d/

/** Password strength 0..3 (0 for empty). */
export function strength(p: string): number {
  if (!p) return 0
  let s = 0
  if (p.length >= 8) s++
  if (LETTER.test(p) && DIGIT.test(p)) s++
  if (p.length >= 12 || /[^\p{L}0-9]/u.test(p)) s++
  return s
}

/** i18n key, or '' when the new password is acceptable. */
export function newPwErr(p: string): Key | '' {
  if (!p) return 'auth.err.password'
  if (p.length < 8) return 'auth.err.passwordMin'
  if (!(LETTER.test(p) && DIGIT.test(p))) return 'auth.err.passwordMix'
  return ''
}

export function validate(scr: AuthScreen, f: AuthForm, googleOnly = false): AuthErrors {
  const e: AuthErrors = {}
  const name = f.name ?? ''
  const email = f.email ?? ''
  const password = f.password ?? ''
  const confirm = f.confirm ?? ''
  const current = f.current ?? ''

  if (scr !== 'change' && scr !== 'recovery') {
    if (!email) e.email = 'auth.err.email'
    else if (!EMAIL_RE.test(email)) e.email = 'auth.err.emailInvalid'
  }
  if (scr === 'login' && !password) e.password = 'auth.err.password'
  if (scr === 'register' && !name) e.name = 'auth.err.name'
  if (scr === 'register' || scr === 'change' || scr === 'recovery') {
    const pe = newPwErr(password)
    if (pe) e.password = pe
    if (!confirm) e.confirm = 'auth.err.confirm'
    else if (confirm !== password) e.confirm = 'auth.err.mismatch'
  }
  if (scr === 'change' && !googleOnly) {
    if (!current) e.current = 'auth.err.current'
    else if (password === current) e.password = 'authError.same'
  }
  return e
}

export const newPasswordError = newPwErr
export const validateAuthForm = validate
