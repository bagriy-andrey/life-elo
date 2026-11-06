import type { Theme } from '../i18n/prefs'

export type { Theme }

/** system = no data-theme attribute (CSS follows the OS); light/dark force it. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    const bg = getComputedStyle(root).getPropertyValue('--bg').trim()
    if (bg) meta.setAttribute('content', bg)
  }
}
