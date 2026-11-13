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
      { tab: 'home', garminDay: '2026-11-12' },
      { tab: 'home', garminDay: '2026-11-13', section: 'sleep' },
    ]
    for (const r of routes) {
      const [path, hash] = routePath(r).split('#')
      expect(parseRoute(path, hash ? `#${hash}` : '')).toEqual(r)
    }
  })
  it('parses the Garmin day page under home; invalid days and sections degrade', () => {
    expect(parseRoute('/garmin/2026-11-13', '#sleep')).toEqual({ tab: 'home', garminDay: '2026-11-13', section: 'sleep' })
    expect(routePath({ tab: 'home', garminDay: '2026-11-13', section: 'sleep' })).toBe('/garmin/2026-11-13#sleep')
    expect(routePath({ tab: 'home', garminDay: '2026-11-12' })).toBe('/garmin/2026-11-12')
    expect(parseRoute('/garmin/2026-11-13', '#bogus')).toEqual({ tab: 'home', garminDay: '2026-11-13' })
    expect(parseRoute('/garmin/nope')).toEqual({ tab: 'home' })
    expect(parseRoute('/garmin/2026-02-30')).toEqual({ tab: 'home' })
    expect(parseRoute('/garmin')).toEqual({ tab: 'home' })
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
