import { useEffect, useState } from 'react'
import { status } from './api'
import { cacheFromStatus, loadStatusCache, saveStatusCache, type GarminStatusCache } from './statusCache'

/** Garmin connection status: the per-device cache first, then refreshed from `status()` when online. */
export function useGarminSync(): GarminStatusCache | undefined {
  const [cache, setCache] = useState<GarminStatusCache | undefined>(loadStatusCache)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    let live = true
    void status()
      .then((s) => {
        const next = cacheFromStatus(s, loadStatusCache())
        if (!next) return
        saveStatusCache(next)
        if (live) setCache(next)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])
  return cache
}
