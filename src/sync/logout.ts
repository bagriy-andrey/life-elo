import type { SyncEngine } from './engine'

export interface LogoutDeps {
  engine: Pick<SyncEngine, 'disable' | 'enable' | 'settled'>
  /** Must end the session even offline (global, then local scope). */
  signOut(): Promise<{ error?: string }>
  clearLocalData(): Promise<void>
}

/**
 * Stop sync for good, end the session, then wipe local data. Plain async function (not tied to
 * component state): the auth gate unmounts the app as soon as the session is gone.
 * If sign-out fails nothing is wiped (the user is never signed in on an empty device) and sync is
 * re-enabled, since the user stays signed in.
 */
export async function performLogout(deps: LogoutDeps): Promise<{ ok: boolean }> {
  deps.engine.disable()
  try {
    await deps.engine.settled()
    const out = await deps.signOut()
    if (out.error) {
      deps.engine.enable()
      return { ok: false }
    }
  } catch (e) {
    deps.engine.enable()
    throw e
  }
  await deps.clearLocalData()
  return { ok: true }
}
