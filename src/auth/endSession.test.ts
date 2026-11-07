import { describe, expect, it } from 'vitest'
import { endSession, type SignOutAuth } from './endSession'

function fakeAuth(opts: { globalFails?: boolean; localError?: boolean; localKeepsSession?: boolean }) {
  let session: unknown = { user: 'u' }
  const calls: string[] = []
  const auth: SignOutAuth = {
    async signOut(o) {
      const scope = o?.scope ?? 'global'
      calls.push(scope)
      if (scope === 'global') {
        if (opts.globalFails) return { error: { status: 0, name: 'AuthRetryableFetchError' } }
        session = null
        return { error: null }
      }
      if (!opts.localKeepsSession) session = null
      return { error: opts.localError ? { status: 0, name: 'AuthRetryableFetchError' } : null }
    },
    async getSession() {
      return { data: { session } }
    },
  }
  return { auth, calls }
}

describe('endSession', () => {
  it('online: global sign-out is enough', async () => {
    const { auth, calls } = fakeAuth({})
    expect(await endSession(auth)).toEqual({})
    expect(calls).toEqual(['global'])
  })

  it('offline: local sign-out removed the session but reported the failed request → success', async () => {
    const { auth, calls } = fakeAuth({ globalFails: true, localError: true })
    expect(await endSession(auth)).toEqual({})
    expect(calls).toEqual(['global', 'local'])
  })

  it('fails only when a session is still stored', async () => {
    const { auth } = fakeAuth({ globalFails: true, localError: true, localKeepsSession: true })
    expect((await endSession(auth)).error).toBeTruthy()
  })
})
