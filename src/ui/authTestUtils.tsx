import type { ReactNode } from 'react'
import { AuthContext, type AuthValue } from '../auth/context'
import { I18nProvider } from '../i18n'

const ok = async () => ({})

export function fakeAuth(over: Partial<AuthValue> = {}): AuthValue {
  return {
    configured: true,
    loading: false,
    session: null,
    user: { email: 'a@b.co' } as AuthValue['user'],
    googleOnly: false,
    recovery: null,
    signIn: ok,
    signUp: ok,
    google: ok,
    resetPassword: ok,
    setNewPassword: ok,
    changePassword: ok,
    setPassword: ok,
    changeEmail: ok,
    signOut: ok,
    dismissRecovery: () => {},
    ...over,
  }
}

/** Wraps UI in I18nProvider + a fake auth context (for renderToString smoke tests). */
export function withAuth(node: ReactNode, over?: Partial<AuthValue>) {
  return (
    <I18nProvider>
      <AuthContext.Provider value={fakeAuth(over)}>{node}</AuthContext.Provider>
    </I18nProvider>
  )
}
