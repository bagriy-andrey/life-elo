import { useEffect } from 'react'
import { addDays, toDayKey } from '../domain/day'
import { pull } from './api'

/** While signed in: pulls yesterday..today at app start and whenever the app returns to the foreground (api throttles to 15 min). */
export function useGarminAutoPull(signedIn: boolean): void {
  useEffect(() => {
    if (!signedIn) return
    const run = () => {
      const today = toDayKey(new Date())
      void pull(addDays(today, -1), today)
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') run()
    }
    run()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [signedIn])
}
