import { describe, expect, it } from 'vitest'
import { authErrorText, AUTH_FALLBACK_TEXT } from './errors'

const RATE = 'Слишком часто. Подождите минуту и попробуйте снова.'
const EXPIRED = 'Ссылка устарела или уже использована. Запросите новую.'

describe('authErrorText', () => {
  it('maps codes', () => {
    expect(authErrorText({ code: 'invalid_credentials', status: 400 })).toBe('Неверная почта или пароль')
    const exists = 'Аккаунт с этой почтой уже есть. Войдите или восстановите пароль.'
    expect(authErrorText({ code: 'user_already_exists', status: 422 })).toBe(exists)
    expect(authErrorText({ code: 'email_exists', status: 422 })).toBe(exists)
    expect(authErrorText({ code: 'over_email_send_rate_limit', status: 429 })).toBe(RATE)
    expect(authErrorText({ code: 'over_request_rate_limit', status: 429 })).toBe(RATE)
    expect(authErrorText({ code: 'otp_expired', status: 403 })).toBe(EXPIRED)
    expect(authErrorText({ code: 'weak_password', status: 422 })).toBe('Пароль слишком простой')
    expect(authErrorText({ code: 'same_password', status: 422 })).toBe('Новый пароль совпадает с текущим')
  })
  it('code wins over status', () => {
    expect(authErrorText({ code: 'invalid_credentials', status: 429 })).toBe('Неверная почта или пароль')
  })
  it('maps status 429 and invalid token message', () => {
    expect(authErrorText({ status: 429 })).toBe(RATE)
    expect(authErrorText({ status: 401, message: 'Invalid token' })).toBe(EXPIRED)
    expect(authErrorText({ status: 403, message: 'Email link is invalid or has expired' })).toBe(AUTH_FALLBACK_TEXT)
  })
  it('network failures', () => {
    const offline = 'Нет соединения. Проверьте интернет и попробуйте снова.'
    expect(authErrorText({ name: 'TypeError', message: 'Failed to fetch' })).toBe(offline)
    expect(authErrorText({ name: 'AuthRetryableFetchError', status: 0, message: 'x' })).toBe(offline)
    expect(authErrorText({ message: 'x' })).toBe(offline)
  })
  it('fallback', () => {
    expect(authErrorText({ code: 'unexpected_failure', status: 500 })).toBe(AUTH_FALLBACK_TEXT)
    expect(authErrorText({ status: 500 })).toBe(AUTH_FALLBACK_TEXT)
    expect(authErrorText(null)).toBe(AUTH_FALLBACK_TEXT)
  })
})
