import { describe, expect, it } from 'vitest'
import { en } from '../i18n/en'
import { ru } from '../i18n/ru'
import { translate } from '../i18n/translate'
import { LOCALE, type Dict, type Key, type Lang, type Params } from '../i18n/types'
import { uk } from '../i18n/uk'
import { booleanOptions, formatDay, quotaSummary, ruleSummary, zoneLabels } from './labels'

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
    expect(ruleSummary(tFor('en'), rule)).toBe('Excellent ≤ 0 times · Within limits ≤ 1 times')
    expect(ruleSummary(tFor('uk'), rule)).toBe('Відмінно ≤ 0 разів · У межах ≤ 1 разів')
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
