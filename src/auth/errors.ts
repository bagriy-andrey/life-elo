import type { Key } from '../i18n/types'

export interface AuthErrorLike {
  code?: string
  status?: number
  name?: string
  message?: string
}

export const AUTH_FALLBACK: Key = 'authError.generic'
const RATE: Key = 'authError.rate'
const EXPIRED: Key = 'authError.expired'
const OFFLINE: Key = 'authError.offline'

/** Maps an auth failure to an i18n key; screens translate it with `t`. */
export function authErrorText(error: AuthErrorLike | null | undefined): Key {
  if (!error) return AUTH_FALLBACK
  switch (error.code) {
    case 'invalid_credentials':
      return 'authError.credentials'
    case 'user_already_exists':
    case 'email_exists':
      return 'authError.exists'
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return RATE
    case 'otp_expired':
    case 'flow_state_expired':
    case 'flow_state_not_found':
      return EXPIRED
    case 'weak_password':
      return 'authError.weak'
    case 'same_password':
      return 'authError.same'
  }
  if (error.status === 429) return RATE
  if (/invalid.*token|token.*(expired|invalid)|link.*(invalid|expired)/i.test(error.message ?? '')) return EXPIRED
  if (
    error.status === undefined ||
    error.status === 0 ||
    (error.name === 'TypeError' && /fetch/i.test(error.message ?? ''))
  ) {
    // No HTTP status: request never reached the server.
    if (!error.code) return OFFLINE
  }
  return AUTH_FALLBACK
}
