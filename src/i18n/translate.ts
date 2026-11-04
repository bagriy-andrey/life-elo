import type { Dict, Key, Params, PluralForms } from './types'

export function interpolate(template: string, params?: Params): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m))
}

/** Plural entries pick a form by `params.count` via Intl.PluralRules(locale). */
export function translate(dict: Dict, key: Key, params?: Params, locale = 'ru-RU'): string {
  const value: string | PluralForms = dict[key]
  if (typeof value === 'string') return interpolate(value, params)
  const count = Number(params?.count ?? 0)
  const category = new Intl.PluralRules(locale).select(count)
  const form = (category === 'one' || category === 'few' || category === 'many' ? value[category] : undefined) ?? value.other
  return interpolate(form, params)
}
