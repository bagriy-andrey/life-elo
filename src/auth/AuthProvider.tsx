import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, supabaseConfigured } from './supabase'
import { authErrorText, type AuthErrorLike } from './errors'
import { isGoogleOnly } from './googleOnly'
import { clearRecoveryFromLocation, parseRecoveryUrl } from './recoveryUrl'

export interface ActionResult {
  error?: string
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

const NOT_CONFIGURED = 'Вход пока не настроен.'

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(supabaseConfigured)
  const [recovery, setRecovery] = useState<RecoveryState>(() =>
    supabaseConfigured && parseRecoveryUrl(location.search) ? 'verifying' : null,
  )
  const recoveryStarted = useRef(false)

  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.auth
      .getSession()
      .then(({ data }) => active && setSession(data.session))
      .catch(() => {})
      .finally(() => active && setLoading(false))
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabase || recoveryStarted.current) return
    const found = parseRecoveryUrl(location.search)
    if (!found) return
    recoveryStarted.current = true // token is single-use: verify once even under StrictMode
    supabase.auth
      .verifyOtp({ type: 'recovery', token_hash: found.tokenHash })
      .then(({ error }) => setRecovery(error ? 'invalid' : 'ready'))
      .catch(() => setRecovery('invalid'))
      .finally(clearRecoveryFromLocation)
  }, [])

  const run = useCallback(async <T extends ActionResult>(fn: () => Promise<T>): Promise<T | ActionResult> => {
    if (!supabase) return { error: NOT_CONFIGURED }
    try {
      return await fn()
    } catch (e) {
      return { error: authErrorText(e as AuthErrorLike) }
    }
  }, [])

  const value = useMemo<AuthValue>(() => {
    const fail = (e: AuthErrorLike): ActionResult => ({ error: authErrorText(e) })
    const origin = () => location.origin
    return {
      configured: supabaseConfigured,
      loading,
      session,
      user: session?.user ?? null,
      googleOnly: isGoogleOnly(session?.user),
      recovery,
      signIn: (email, password) =>
        run(async () => {
          const { error } = await supabase!.auth.signInWithPassword({ email, password })
          return error ? fail(error) : {}
        }),
      signUp: (name, email, password) =>
        run(async () => {
          const { error } = await supabase!.auth.signUp({ email, password, options: { data: { name } } })
          return error ? fail(error) : {}
        }),
      google: () =>
        run(async () => {
          const { error } = await supabase!.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: origin() },
          })
          return error ? fail(error) : {}
        }),
      resetPassword: (email) =>
        run(async () => {
          const { error } = await supabase!.auth.resetPasswordForEmail(email, { redirectTo: origin() })
          // Same success for unknown emails; only rate limits / network are surfaced.
          if (error && (error.status === 429 || error.status === 0 || error.status === undefined)) return fail(error)
          return {}
        }),
      setNewPassword: (password) =>
        run(async () => {
          const { error } = await supabase!.auth.updateUser({ password })
          if (error) return fail(error)
          await supabase!.auth.signOut({ scope: 'global' }).catch(() => {})
          setRecovery('done')
          return {}
        }),
      changePassword: (current, next) =>
        run<ChangePasswordResult>(async () => {
          const email = session?.user.email
          if (!email) return { error: authErrorText(null) }
          const check = await supabase!.auth.signInWithPassword({ email, password: current })
          if (check.error) {
            if (check.error.code === 'invalid_credentials')
              return { error: 'Текущий пароль указан неверно', wrongCurrent: true }
            return fail(check.error)
          }
          const { error } = await supabase!.auth.updateUser({ password: next })
          if (error) return fail(error)
          await supabase!.auth.signOut({ scope: 'others' }).catch(() => {})
          return {}
        }),
      setPassword: (password) =>
        run(async () => {
          const { error } = await supabase!.auth.updateUser({ password, data: { password_set: true } })
          return error ? fail(error) : {}
        }),
      signOut: () =>
        run(async () => {
          const { error } = await supabase!.auth.signOut()
          return error ? fail(error) : {}
        }),
      dismissRecovery: () => setRecovery(null),
    }
  }, [loading, session, recovery, run])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
