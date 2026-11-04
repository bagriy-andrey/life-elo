export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export type AuthScreen = 'login' | 'register' | 'forgot' | 'change' | 'recovery'
export type AuthField = 'name' | 'email' | 'password' | 'confirm' | 'current'
export type AuthForm = Partial<Record<AuthField, string>>
export type AuthErrors = Partial<Record<AuthField, string>>

const LETTER = /[A-Za-zА-Яа-я]/
const DIGIT = /\d/

/** Password strength 0..3 (0 for empty). */
export function strength(p: string): number {
  if (!p) return 0
  let s = 0
  if (p.length >= 8) s++
  if (LETTER.test(p) && DIGIT.test(p)) s++
  if (p.length >= 12 || /[^A-Za-zА-Яа-я0-9]/.test(p)) s++
  return s
}

/** '' when the new password is acceptable. */
export function newPwErr(p: string): string {
  if (!p) return 'Введите пароль'
  if (p.length < 8) return 'Минимум 8 символов'
  if (!(LETTER.test(p) && DIGIT.test(p))) return 'Добавьте хотя бы одну букву и цифру'
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
    if (!email) e.email = 'Введите почту'
    else if (!EMAIL_RE.test(email)) e.email = 'Похоже, в адресе ошибка'
  }
  if (scr === 'login' && !password) e.password = 'Введите пароль'
  if (scr === 'register' && !name) e.name = 'Введите имя'
  if (scr === 'register' || scr === 'change' || scr === 'recovery') {
    const pe = newPwErr(password)
    if (pe) e.password = pe
    if (!confirm) e.confirm = 'Повторите пароль'
    else if (confirm !== password) e.confirm = 'Пароли не совпадают'
  }
  if (scr === 'change' && !googleOnly) {
    if (!current) e.current = 'Введите текущий пароль'
    else if (password === current) e.password = 'Новый пароль совпадает с текущим'
  }
  return e
}

export const newPasswordError = newPwErr
export const validateAuthForm = validate
