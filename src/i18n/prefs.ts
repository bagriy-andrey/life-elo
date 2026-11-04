import { DEFAULT_LANG, LANGS, type Lang } from './types'

export const PREFS_KEY = 'life-elo:prefs'

export interface Prefs {
  lang: Lang
}

export function parsePrefs(raw: string | null): Prefs {
  try {
    const data: unknown = raw ? JSON.parse(raw) : null
    const lang = (data as { lang?: unknown } | null)?.lang
    return { lang: LANGS.includes(lang as Lang) ? (lang as Lang) : DEFAULT_LANG }
  } catch {
    return { lang: DEFAULT_LANG }
  }
}

export function loadPrefs(): Prefs {
  try {
    return parsePrefs(localStorage.getItem(PREFS_KEY))
  } catch {
    return { lang: DEFAULT_LANG }
  }
}

/** Merges into the stored object so fields owned by other features (theme) survive. */
export function savePrefs(patch: Partial<Prefs>): void {
  try {
    let current: Record<string, unknown> = {}
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null')
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) current = parsed as Record<string, unknown>
    } catch {
      /* garbage: overwrite */
    }
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...patch }))
  } catch {
    /* storage unavailable: preference lasts for this session only */
  }
}
