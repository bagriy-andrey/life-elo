import type { ru } from './ru'

export type Lang = 'ru' | 'en' | 'uk'
export const LANGS: readonly Lang[] = ['ru', 'en', 'uk']
export const DEFAULT_LANG: Lang = 'ru'

/** Dates/months/plurals use Intl with these locales (month and day names are not dictionary entries). */
export const LOCALE: Record<Lang, string> = { ru: 'ru-RU', en: 'en-GB', uk: 'uk-UA' }

export interface PluralForms {
  one: string
  few?: string
  many?: string
  other: string
}

/** ru.ts defines the key set; a plural entry in ru must be a plural entry everywhere. */
export type Key = keyof typeof ru
export type Dict = { [K in Key]: (typeof ru)[K] extends string ? string : PluralForms }
export type Params = Record<string, string | number>
