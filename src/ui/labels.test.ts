import { describe, expect, it } from 'vitest'
import { en } from '../i18n/en'
import { ru } from '../i18n/ru'
import { translate } from '../i18n/translate'
import { LOCALE, type Dict, type Key, type Lang, type Params } from '../i18n/types'
import { uk } from '../i18n/uk'
import { booleanOptions, formatBirth, formatDay, quotaSummary, ruleSummary, zoneLabels } from './labels'

const tFor = (lang: Lang) => {
  const dict: Dict = { ru, en, uk }[lang]
  return (key: Key, params?: Params) => translate(dict, key, params, LOCALE[lang])
}

describe('formatDay', () => {
  it('uses the locale month names', () => {
    expect(formatDay('2026-05-14', LOCALE.ru)).toContain('мая')
    expect(formatDay('2026-05-14', LOCALE.en)).toContain('May')
    expect(formatDay('2026-05-14', LOCALE.uk)).toContain('травня')
  })
})

describe('ruleSummary', () => {
  const rule = { kind: 'measured', unit: 'count', better: 'lower', excellent: 0, ok: 1 } as const
  it('per language', () => {
    expect(ruleSummary(tFor('ru'), rule)).toBe('Отлично ≤ 0 раз · В рамках ≤ 1 раз')
    expect(ruleSummary(tFor('en'), rule)).toBe('Excellent ≤ 0 times · Within limits ≤ 1 time')
    expect(ruleSummary(tFor('uk'), rule)).toBe('Відмінно ≤ 0 разів · У межах ≤ 1 раз')
  })
  it('unit suffix is plural-aware', () => {
    const r = (unit: 'count' | 'steps' | 'minutes', n: number) =>
      ({ kind: 'measured', unit, better: 'higher', excellent: n }) as const
    const out = (lang: Lang, unit: 'count' | 'steps' | 'minutes') =>
      [1, 2, 5, 21].map((n) => ruleSummary(tFor(lang), r(unit, n)).replace(/^.*≥ /, ''))
    expect(out('ru', 'count')).toEqual(['1 раз', '2 раза', '5 раз', '21 раз'])
    expect(out('ru', 'steps')).toEqual(['1 шаг', '2 шага', '5 шагов', '21 шаг'])
    expect(out('en', 'count')).toEqual(['1 time', '2 times', '5 times', '21 times'])
    expect(out('en', 'steps')).toEqual(['1 step', '2 steps', '5 steps', '21 steps'])
    expect(out('en', 'minutes')).toEqual(['1 min', '2 min', '5 min', '21 min'])
    expect(out('uk', 'count')).toEqual(['1 раз', '2 рази', '5 разів', '21 раз'])
    expect(out('uk', 'steps')).toEqual(['1 крок', '2 кроки', '5 кроків', '21 крок'])
    expect(out('ru', 'minutes')).toEqual(['1 мин', '2 мин', '5 мин', '21 мин'])
  })
  it('time has no suffix, boolean is yes/no', () => {
    const time = { kind: 'measured', unit: 'time', better: 'higher', excellent: '07:00' } as const
    expect(ruleSummary(tFor('en'), time)).toBe('Excellent ≥ 07:00')
    expect(ruleSummary(tFor('en'), { kind: 'boolean' } as never)).toBe('Yes/no')
  })
})

describe('quotaSummary', () => {
  it('per language, with reducer', () => {
    const q = { perDay: 2, perWeek: 5, reducedByDaysOf: 'x' }
    expect(quotaSummary(tFor('ru'), q, () => 'Спорт')).toBe('Лимит 2/день, 5/неделю (уменьшается днями «Спорт»)')
    expect(quotaSummary(tFor('en'), q, () => 'Gym')).toBe('Limit 2/day, 5/week (reduced by days of "Gym")')
    expect(quotaSummary(tFor('uk'), { perDay: 1 }, () => undefined)).toBe('Ліміт 1/день')
  })
})

describe('label maps', () => {
  it('translate zones and boolean answers', () => {
    expect(zoneLabels(tFor('en')).ok).toBe('Within limits')
    expect(booleanOptions(tFor('uk')).destructive.map((o) => o.label)).toEqual(['Дотримувався', 'Порушив', 'Неактуально'])
  })
})

describe('formatBirth', () => {
  it('formats date and plural age per language', () => {
    expect(formatBirth('1996-05-14', '2026-05-14', tFor('ru'), LOCALE.ru)).toMatch(/^14 мая 1996 г?\.? · 30 лет$/)
    expect(formatBirth('1996-05-15', '2026-05-14', tFor('ru'), LOCALE.ru)).toContain('· 29 лет')
    expect(formatBirth('2025-01-01', '2026-05-14', tFor('ru'), LOCALE.ru)).toContain('· 1 год')
    expect(formatBirth('2022-01-01', '2026-05-14', tFor('ru'), LOCALE.ru)).toContain('· 4 года')
    expect(formatBirth('1996-05-14', '2026-05-14', tFor('en'), LOCALE.en)).toContain('May 1996 · 30 years old')
    expect(formatBirth('1996-05-14', '2026-05-14', tFor('uk'), LOCALE.uk)).toContain('травня 1996')
    expect(formatBirth('1996-05-14', '2026-05-14', tFor('uk'), LOCALE.uk)).toContain('· 30 років')
  })
})
