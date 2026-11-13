import { describe, expect, it } from 'vitest'
import { parseRoute, routePath, type Route } from './route'

describe('route', () => {
  it('round-trips every screen through its path', () => {
    const routes: Route[] = [
      { tab: 'home' },
      { tab: 'review' },
      { tab: 'review', day: '2026-11-05' },
      { tab: 'habits' },
      { tab: 'habits', id: 'h1' },
      { tab: 'habits', id: 'a b/c' },
      { tab: 'profile' },
      { tab: 'profile', password: true },
      { tab: 'profile', garminDay: '2026-11-12' },
    ]
    for (const r of routes) expect(parseRoute(routePath(r))).toEqual(r)
  })
  it('parses the Garmin day page and sends invalid days to the profile', () => {
    expect(parseRoute('/garmin/2026-11-12')).toEqual({ tab: 'profile', garminDay: '2026-11-12' })
    expect(routePath({ tab: 'profile', garminDay: '2026-11-12' })).toBe('/garmin/2026-11-12')
    expect(parseRoute('/garmin/nope')).toEqual({ tab: 'profile' })
    expect(parseRoute('/garmin/2026-02-30')).toEqual({ tab: 'profile' })
    expect(parseRoute('/garmin')).toEqual({ tab: 'profile' })
  })
  it('tolerates a trailing slash', () => {
    expect(parseRoute('/habits/')).toEqual({ tab: 'habits' })
  })
  it('parses and encodes the habit page id', () => {
    expect(parseRoute('/habits/h1')).toEqual({ tab: 'habits', id: 'h1' })
    expect(parseRoute('/habits/a%20b')).toEqual({ tab: 'habits', id: 'a b' })
    expect(routePath({ tab: 'habits', id: 'a b/c' })).toBe('/habits/a%20b%2Fc')
  })
  it('falls back to home for unknown or malformed paths', () => {
    expect(parseRoute('/nope')).toEqual({ tab: 'home' })
    expect(parseRoute('/review/yesterday')).toEqual({ tab: 'home' })
    expect(parseRoute('/habits/1/extra')).toEqual({ tab: 'home' })
    expect(parseRoute('/profile/password/x')).toEqual({ tab: 'home' })
  })
})
