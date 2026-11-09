import { useCallback, useEffect, useState } from 'react'

/** A screen addressable by URL, so a reload (or back/forward) keeps the user where they were. */
export type Route =
  | { tab: 'home' }
  | { tab: 'review'; /** Day being reviewed; yesterday when omitted. */ day?: string }
  | { tab: 'habits'; /** Habit page when set; the list otherwise. */ id?: string }
  | { tab: 'profile'; password?: boolean }

export type Tab = Route['tab']

const DAY = /^\d{4}-\d{2}-\d{2}$/

/** Unknown paths fall back to home. */
export function parseRoute(pathname: string): Route {
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
  if (first === 'profile' && second === undefined) return { tab: 'profile' }
  if (first === 'profile' && second === 'password') return { tab: 'profile', password: true }
  return { tab: 'home' }
}

export function routePath(route: Route): string {
  switch (route.tab) {
    case 'home':
      return '/'
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
  const [route, setRoute] = useState(() => parseRoute(location.pathname))

  useEffect(() => {
    // Normalize unknown/odd paths in the address bar; keep the query (auth callbacks read it).
    const path = routePath(parseRoute(location.pathname))
    if (location.pathname !== path) history.replaceState(history.state, '', path + location.search + location.hash)
    const onPop = () => setRoute(parseRoute(location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((next: Route, opts?: { replace?: boolean }) => {
    const path = routePath(next)
    if (path !== location.pathname) {
      if (opts?.replace) history.replaceState(history.state, '', path)
      else history.pushState(null, '', path)
    }
    setRoute(next)
  }, [])

  return [route, navigate]
}
