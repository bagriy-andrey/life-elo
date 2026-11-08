import type { User } from '@supabase/supabase-js'
import type { Key } from '../i18n/types'
import { EMAIL_RE } from './validation'

/** True iff the account has an email/password identity (Google-only accounts cannot change it). */
export function canChangeLoginEmail(user: User | null | undefined): boolean {
  if (!user) return false
  return (user.identities ?? []).some((i) => i.provider === 'email')
}

/** i18n key, or '' when `next` is an acceptable new login email. */
export function validateNewEmail(next: string, current: string | null | undefined): Key | '' {
  const value = next.trim()
  if (!value) return 'auth.err.email'
  if (!EMAIL_RE.test(value)) return 'auth.err.emailInvalid'
  if (current && value.toLowerCase() === current.trim().toLowerCase()) return 'account.emailSame'
  return ''
}
