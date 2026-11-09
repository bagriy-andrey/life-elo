import { describe, expect, it } from 'vitest'
import type { User } from '@supabase/supabase-js'
import { canChangeLoginEmail, validateNewEmail } from './loginEmail'

const u = (providers?: string[]) =>
  ({ identities: providers?.map((provider) => ({ provider })) }) as unknown as User

describe('canChangeLoginEmail', () => {
  it('is true with an email identity', () => {
    expect(canChangeLoginEmail(u(['email']))).toBe(true)
    expect(canChangeLoginEmail(u(['google', 'email']))).toBe(true)
  })
  it('is false for Google-only, empty, missing identities and null', () => {
    expect(canChangeLoginEmail(u(['google']))).toBe(false)
    expect(canChangeLoginEmail(u([]))).toBe(false)
    expect(canChangeLoginEmail(u())).toBe(false)
    expect(canChangeLoginEmail(null)).toBe(false)
  })
})

describe('validateNewEmail', () => {
  it('rejects empty and malformed', () => {
    expect(validateNewEmail('', 'a@b.co')).toBe('auth.err.email')
    expect(validateNewEmail('nope', 'a@b.co')).toBe('auth.err.emailInvalid')
  })
  it('rejects the current email case-insensitively', () => {
    expect(validateNewEmail('A@B.co', 'a@b.co')).toBe('account.emailSame')
  })
  it('accepts a different valid email', () => {
    expect(validateNewEmail('new@b.co', 'a@b.co')).toBe('')
    expect(validateNewEmail('new@b.co', undefined)).toBe('')
  })
})
