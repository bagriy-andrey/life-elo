/** The slice of supabase-js auth that `endSession` needs (kept small so it can be faked in tests). */
export interface SignOutAuth {
  signOut(options?: { scope?: 'global' | 'local' }): Promise<{ error: unknown }>
  getSession(): Promise<{ data: { session: unknown } }>
}

/**
 * Ends the session even offline. Global sign-out fails without network and keeps the session;
 * local sign-out removes the stored session first but may still report the failed request.
 * So success is decided by whether a session is left, not by the returned error.
 */
export async function endSession(auth: SignOutAuth): Promise<{ error?: unknown }> {
  const global = await auth.signOut().catch((error: unknown) => ({ error }))
  if (!global.error) return {}
  const local = await auth.signOut({ scope: 'local' }).catch((error: unknown) => ({ error }))
  const { data } = await auth.getSession().catch(() => ({ data: { session: 'unknown' } }))
  return data.session === null ? {} : { error: local.error ?? global.error }
}
