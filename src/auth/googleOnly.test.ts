import type { User } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { isGoogleOnly } from './googleOnly'

const u = (providers: string[], meta: Record<string, unknown> = {}) =>
  ({ identities: providers.map((provider) => ({ provider })), user_metadata: meta }) as unknown as User

describe('isGoogleOnly', () => {
  it('google identity only', () => expect(isGoogleOnly(u(['google']))).toBe(true))
  it('email identity present', () => expect(isGoogleOnly(u(['google', 'email']))).toBe(false))
  it('password_set via app', () => expect(isGoogleOnly(u(['google'], { password_set: true }))).toBe(false))
  it('no user', () => expect(isGoogleOnly(null)).toBe(false))
})
