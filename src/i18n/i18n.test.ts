import { describe, expect, it } from 'vitest'
import { en } from './en'
import { parsePrefs } from './prefs'
import { ru } from './ru'
import { interpolate, translate } from './translate'
import { LOCALE, type Dict } from './types'
import { uk } from './uk'

const dicts: Record<string, Dict> = { ru, en, uk }
const placeholders = (v: unknown): string[] => {
  const strings = typeof v === 'string' ? [v] : Object.values(v as Record<string, string>)
  return [...new Set(strings.flatMap((s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1])))].sort()
}

describe('translate', () => {
  it('interpolates and keeps unknown placeholders', () => {
    expect(interpolate('Hi {name}, {x}', { name: 'A' })).toBe('Hi A, {x}')
    expect(translate(ru, 'common.save')).toBe('Сохранить')
  })

  it('picks ru plural forms', () => {
    const f = (n: number) => translate(ru, 'common.cleanDays', { count: n }, LOCALE.ru)
    expect(f(1)).toBe('1 чистый день')
    expect(f(2)).toBe('2 чистых дня')
    expect(f(5)).toBe('5 чистых дней')
    expect(f(21)).toBe('21 чистый день')
    expect(f(11)).toBe('11 чистых дней')
  })

  it('picks en and uk plural forms', () => {
    expect(translate(en, 'common.cleanDays', { count: 1 }, LOCALE.en)).toBe('1 clean day')
    expect(translate(en, 'common.cleanDays', { count: 3 }, LOCALE.en)).toBe('3 clean days')
    expect(translate(uk, 'common.cleanDays', { count: 2 }, LOCALE.uk)).toBe('2 чисті дні')
    expect(translate(uk, 'common.cleanDays', { count: 5 }, LOCALE.uk)).toBe('5 чистих днів')
  })
})

describe('dictionaries', () => {
  it('have identical key sets and placeholders', () => {
    const keys = Object.keys(ru).sort()
    for (const [name, d] of Object.entries(dicts)) {
      expect(Object.keys(d).sort(), name).toEqual(keys)
      for (const k of keys) {
        expect(placeholders((d as Record<string, unknown>)[k]), `${name}:${k}`).toEqual(
          placeholders((ru as Record<string, unknown>)[k]),
        )
      }
    }
  })
})

describe('parsePrefs', () => {
  it('reads a valid language', () => {
    expect(parsePrefs('{"lang":"en"}')).toEqual({ lang: 'en', theme: 'system' })
  })
  it('reads a valid theme and defaults each field independently', () => {
    expect(parsePrefs('{"lang":"uk","theme":"dark"}')).toEqual({ lang: 'uk', theme: 'dark' })
    expect(parsePrefs('{"theme":"light"}')).toEqual({ lang: 'ru', theme: 'light' })
    expect(parsePrefs('{"lang":"en","theme":"pink"}')).toEqual({ lang: 'en', theme: 'system' })
  })
  it('tolerates garbage', () => {
    for (const raw of [null, '', '{', 'null', '[]', '{"lang":"de"}', '{"lang":5}', '42']) {
      expect(parsePrefs(raw)).toEqual({ lang: 'ru', theme: 'system' })
    }
  })
})
