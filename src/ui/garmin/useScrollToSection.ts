import { useEffect } from 'react'

const SECTION_IDS = ['sleep', 'recovery', 'activity', 'stress', 'breath'] as const
export type SectionId = (typeof SECTION_IDS)[number]

/** `#stress` -> `stress`; unknown or empty hashes -> undefined. */
export function sectionIdFromHash(hash: string): SectionId | undefined {
  const id = hash.replace(/^#/, '')
  return SECTION_IDS.find((s) => s === id)
}

/** Scroll to a known section; returns whether an element was found. */
export function scrollToSection(
  id: string | undefined,
  find: (id: string) => Pick<HTMLElement, 'scrollIntoView'> | null = (x) => document.getElementById(x),
): boolean {
  if (!id || !SECTION_IDS.some((s) => s === id)) return false
  const el = find(id)
  if (!el) return false
  el.scrollIntoView?.({ block: 'start' })
  return true
}

/** Scrolls to `section` once `ready` (data rendered), and again on `hashchange`. */
export function useScrollToSection(section: string | undefined, ready: boolean): void {
  useEffect(() => {
    if (ready) scrollToSection(section)
  }, [ready, section])
  useEffect(() => {
    if (!ready) return
    const onHash = () => scrollToSection(sectionIdFromHash(location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [ready])
}
