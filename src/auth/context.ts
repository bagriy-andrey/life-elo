import { createContext, useContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { Key } from '../i18n/types'

export interface ActionResult {
  /** i18n key; screens translate it with `t`. */
  error?: Key
}
export interface ChangePasswordResult extends ActionResult {
  /** True when the current password was wrong (UI shows it on the current-password field). */
  wrongCurrent?: boolean
}
/** null = no recovery link; verifying → ready (set password) | invalid (expired) → done (saved). */
export type RecoveryState = null | 'verifying' | 'ready' | 'invalid' | 'done'

export interface AuthValue {
  configured: boolean
  loading: boolean
  session: Session | null
  user: User | null
  googleOnly: boolean
  recovery: RecoveryState
  signIn(email: string, password: string): Promise<ActionResult>
  signUp(name: string, email: string, password: string): Promise<ActionResult>
  google(): Promise<ActionResult>
  resetPassword(email: string): Promise<ActionResult>
  setNewPassword(password: string): Promise<ActionResult>
  changePassword(current: string, next: string): Promise<ChangePasswordResult>
  /** Password for a Google-only account (no current password). */
  setPassword(password: string): Promise<ActionResult>
  signOut(): Promise<ActionResult>
  /** Leaves the recovery flow (e.g. to the forgot screen). */
  dismissRecovery(): void
}

/** Exported so tests can provide a fake value. */
export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
