import { describe, expect, it } from 'vitest'
import { authErrorText, AUTH_FALLBACK } from './errors'

const RATE = 'authError.rate'
const EXPIRED = 'authError.expired'

describe('authErrorText', () => {
  it('maps codes', () => {
    expect(authErrorText({ code: 'invalid_credentials', status: 400 })).toBe('authError.credentials')
    const exists = 'authError.exists'
    expect(authErrorText({ code: 'user_already_exists', status: 422 })).toBe(exists)
    expect(authErrorText({ code: 'email_exists', status: 422 })).toBe(exists)
    expect(authErrorText({ code: 'over_email_send_rate_limit', status: 429 })).toBe(RATE)
    expect(authErrorText({ code: 'over_request_rate_limit', status: 429 })).toBe(RATE)
    expect(authErrorText({ code: 'otp_expired', status: 403 })).toBe(EXPIRED)
    expect(authErrorText({ code: 'weak_password', status: 422 })).toBe('authError.weak')
    expect(authErrorText({ code: 'same_password', status: 422 })).toBe('authError.same')
  })
  it('code wins over status', () => {
    expect(authErrorText({ code: 'invalid_credentials', status: 429 })).toBe('authError.credentials')
  })
  it('maps status 429 and invalid token message', () => {
    expect(authErrorText({ status: 429 })).toBe(RATE)
    expect(authErrorText({ status: 401, message: 'Invalid token' })).toBe(EXPIRED)
    expect(authErrorText({ status: 403, message: 'Email link is invalid or has expired' })).toBe(EXPIRED)
  })
  it('network failures', () => {
    const offline = 'authError.offline'
    expect(authErrorText({ name: 'TypeError', message: 'Failed to fetch' })).toBe(offline)
    expect(authErrorText({ name: 'AuthRetryableFetchError', status: 0, message: 'x' })).toBe(offline)
    expect(authErrorText({ message: 'x' })).toBe(offline)
  })
  it('fallback', () => {
    expect(authErrorText({ code: 'unexpected_failure', status: 500 })).toBe(AUTH_FALLBACK)
    expect(authErrorText({ status: 500 })).toBe(AUTH_FALLBACK)
    expect(authErrorText(null)).toBe(AUTH_FALLBACK)
  })
})
