import type { User } from '@supabase/supabase-js'

/** No email identity and no password set via the app. */
export function isGoogleOnly(user: User | null | undefined): boolean {
  if (!user) return false
  const hasEmail = (user.identities ?? []).some((i) => i.provider === 'email')
  return !hasEmail && user.user_metadata?.password_set !== true
}
