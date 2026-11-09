import { describe, expect, it } from 'vitest'
import { parseRoute, routePath, type Route } from './route'

describe('route', () => {
  it('round-trips every screen through its path', () => {
    const routes: Route[] = [
      { tab: 'home' },
      { tab: 'review' },
      { tab: 'review', day: '2026-11-05' },
      { tab: 'habits' },
      { tab: 'profile' },
      { tab: 'profile', password: true },
    ]
    for (const r of routes) expect(parseRoute(routePath(r))).toEqual(r)
  })
  it('tolerates a trailing slash', () => {
    expect(parseRoute('/habits/')).toEqual({ tab: 'habits' })
  })
  it('falls back to home for unknown or malformed paths', () => {
    expect(parseRoute('/nope')).toEqual({ tab: 'home' })
    expect(parseRoute('/review/yesterday')).toEqual({ tab: 'home' })
    expect(parseRoute('/habits/1')).toEqual({ tab: 'home' })
    expect(parseRoute('/profile/password/x')).toEqual({ tab: 'home' })
  })
})
