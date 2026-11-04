import { DEFAULT_LANG, LANGS, type Lang } from './types'

export const PREFS_KEY = 'life-elo:prefs'

export const THEMES = ['system', 'light', 'dark'] as const
export type Theme = (typeof THEMES)[number]
export const DEFAULT_THEME: Theme = 'system'

export interface Prefs {
  lang: Lang
  theme: Theme
}

const DEFAULTS: Prefs = { lang: DEFAULT_LANG, theme: DEFAULT_THEME }

export function parsePrefs(raw: string | null): Prefs {
  try {
    const data: unknown = raw ? JSON.parse(raw) : null
    const { lang, theme } = (data ?? {}) as { lang?: unknown; theme?: unknown }
    return {
      lang: LANGS.includes(lang as Lang) ? (lang as Lang) : DEFAULTS.lang,
      theme: THEMES.includes(theme as Theme) ? (theme as Theme) : DEFAULTS.theme,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function loadPrefs(): Prefs {
  try {
    return parsePrefs(localStorage.getItem(PREFS_KEY))
  } catch {
    return { ...DEFAULTS }
  }
}

/** Merges into the stored object so fields owned by other features (unknown keys) survive. */
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
