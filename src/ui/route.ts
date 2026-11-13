import { useCallback, useEffect, useState } from 'react'

/** A screen addressable by URL, so a reload (or back/forward) keeps the user where they were. */
export type Route =
  | { tab: 'home'; /** Garmin day page (`/garmin/:day`). */ garminDay?: string; /** Section to scroll to (`#sleep`). */ section?: GarminSection }
  | { tab: 'review'; /** Day being reviewed; yesterday when omitted. */ day?: string }
  | { tab: 'habits'; /** Habit page when set; the list otherwise. */ id?: string }
  | { tab: 'profile'; password?: boolean }

export const GARMIN_SECTIONS = ['sleep', 'recovery', 'activity', 'stress'] as const
export type GarminSection = (typeof GARMIN_SECTIONS)[number]

export type Tab = Route['tab']

const DAY = /^\d{4}-\d{2}-\d{2}$/

/** A real calendar day key (`2026-02-30` is rejected). */
function isDayKey(s: string): boolean {
  if (!DAY.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

/** Unknown paths fall back to home. */
export function parseRoute(pathname: string, hash = ''): Route {
  const [first, second, ...rest] = pathname.split('/').filter(Boolean)
  if (rest.length > 0) return { tab: 'home' }
  if (first === 'review' && (second === undefined || DAY.test(second))) return second ? { tab: 'review', day: second } : { tab: 'review' }
  if (first === 'habits' && second === undefined) return { tab: 'habits' }
  if (first === 'habits' && second) {
    try {
      return { tab: 'habits', id: decodeURIComponent(second) }
    } catch {
      return { tab: 'home' }
    }
  }
  if (first === 'garmin') {
    if (!second || !isDayKey(second)) return { tab: 'home' }
    const section = GARMIN_SECTIONS.find((s) => s === hash.replace(/^#/, ''))
    return section ? { tab: 'home', garminDay: second, section } : { tab: 'home', garminDay: second }
  }
  if (first === 'profile' && second === undefined) return { tab: 'profile' }
  if (first === 'profile' && second === 'password') return { tab: 'profile', password: true }
  return { tab: 'home' }
}

export function routePath(route: Route): string {
  switch (route.tab) {
    case 'home':
      return route.garminDay ? `/garmin/${route.garminDay}${route.section ? `#${route.section}` : ''}` : '/'
    case 'review':
      return route.day ? `/review/${route.day}` : '/review'
    case 'habits':
      return route.id ? `/habits/${encodeURIComponent(route.id)}` : '/habits'
    case 'profile':
      return route.password ? '/profile/password' : '/profile'
  }
}

/** Current route from `location.pathname` plus a navigate function (pushState, or replaceState with `replace`). */
export function useRoute(): [Route, (next: Route, opts?: { replace?: boolean }) => void] {
  const [route, setRoute] = useState(() => parseRoute(location.pathname, location.hash))

  useEffect(() => {
    // Normalize unknown/odd paths in the address bar; keep the query (auth callbacks read it).
    const path = routePath(parseRoute(location.pathname, location.hash)).split('#')[0]
    if (location.pathname !== path) history.replaceState(history.state, '', path + location.search + location.hash)
    const onPop = () => setRoute(parseRoute(location.pathname, location.hash))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((next: Route, opts?: { replace?: boolean }) => {
    const full = routePath(next)
    if (full !== location.pathname + location.hash) {
      if (opts?.replace) history.replaceState(history.state, '', full)
      else history.pushState(null, '', full)
    }
    setRoute(next)
  }, [])

  return [route, navigate]
}
