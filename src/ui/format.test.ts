import { describe, expect, it } from 'vitest'
import { en } from '../i18n/en'
import { ru } from '../i18n/ru'
import { translate } from '../i18n/translate'
import { LOCALE, type Dict, type Key, type Lang, type Params } from '../i18n/types'
import { formatClock, formatDayShort, formatDelta, formatDurationSec, formatNumber, formatSyncTime, formatWeekRange } from './format'

const tFor = (lang: Lang) => {
  const dict: Dict = { ru, en }[lang as 'ru' | 'en']
  return (key: Key, params?: Params) => translate(dict, key, params, LOCALE[lang])
}

describe('format', () => {
  it('formatDayShort: short weekday, lower-case month', () => {
    expect(formatDayShort('2026-11-13', 'ru')).toBe('пт, 13 ноября')
    expect(formatDayShort('2026-11-13', 'en')).toBe('Fri, November 13')
    expect(formatDayShort('2026-11-13', 'uk')).toMatch(/^пт, 13 листопада$/)
  })

  it('formatDurationSec across locales and edges', () => {
    expect(formatDurationSec(29760, 'ru')).toBe('8 ч 16 мин')
    expect(formatDurationSec(29760, 'en')).toBe('8 h 16 min')
    expect(formatDurationSec(29760, 'uk')).toBe('8 год 16 хв')
    expect(formatDurationSec(0, 'ru')).toBe('0 мин')
    expect(formatDurationSec(59 * 60, 'ru')).toBe('59 мин')
    expect(formatDurationSec(26 * 3600 + 5 * 60, 'ru')).toBe('26 ч 5 мин')
  })

  it('formatNumber uses NBSP grouping and U+2212', () => {
    expect(formatNumber(11711, 'ru')).toBe('11 711')
    expect(formatNumber(11711, 'uk')).toBe('11 711')
    expect(formatNumber(11711, 'en')).toBe('11,711')
    expect(formatNumber(-1234, 'ru')).toBe('−1 234')
    expect(formatNumber(1.5, 'ru', 1)).toBe('1,5')
    expect(formatDelta(-4)).toBe('−4')
    expect(formatDelta(62)).toBe('+62')
  })

  it('formatWeekRange', () => {
    expect(formatWeekRange('2026-11-09', '2026-11-15', 'ru')).toBe('9–15 ноября')
    expect(formatWeekRange('2026-10-26', '2026-11-01', 'ru')).toBe('26 октября – 1 ноября')
  })

  it('formatSyncTime: clock, or «вчера в» after 24 h', () => {
    const t = tFor('ru')
    const at = new Date(2026, 10, 13, 13, 57)
    expect(formatClock(at)).toBe('13:57')
    expect(formatSyncTime(at.toISOString(), new Date(2026, 10, 13, 15, 0), t)).toBe('13:57')
    expect(formatSyncTime(at.toISOString(), new Date(2026, 10, 14, 15, 0), t)).toBe('вчера в 13:57')
    expect(formatSyncTime(at.toISOString(), new Date(2026, 10, 14, 15, 0), tFor('en'))).toBe('yesterday at 13:57')
  })
})
