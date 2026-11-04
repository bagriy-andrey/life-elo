import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { en } from './en'
import { loadPrefs, savePrefs } from './prefs'
import { ru } from './ru'
import { translate } from './translate'
import { DEFAULT_LANG, LOCALE, type Dict, type Key, type Lang, type Params } from './types'
import { uk } from './uk'

const DICTS: Record<Lang, Dict> = { ru, en, uk }

export interface I18n {
  t: (key: Key, params?: Params) => string
  lang: Lang
  locale: string
  setLang: (lang: Lang) => void
}

function build(lang: Lang, setLang: (lang: Lang) => void): I18n {
  const locale = LOCALE[lang]
  return { t: (key, params) => translate(DICTS[lang], key, params, locale), lang, locale, setLang }
}

// Without a provider (design-sync previews, tests) components render in ru.
const fallback = build(DEFAULT_LANG, () => {})
const Ctx = createContext<I18n>(fallback)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => loadPrefs().lang)
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    savePrefs({ lang: next })
  }, [])
  const value = useMemo(() => build(lang, setLang), [lang, setLang])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useI18n(): I18n {
  return useContext(Ctx)
}
