import type { ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AmountSeries, MonthCount, WeeklySeries } from '../../domain/habitCharts'
import type { DayKey } from '../../domain/types'
import { I18nProvider } from '../../i18n'
import { AmountChart, MonthlyChart, WeeklyChart } from './BarCharts'

const wrap = (n: ReactNode) => renderToString(<I18nProvider>{n}</I18nProvider>)
const count = (html: string, s: string) => html.split(s).length - 1

const amount = (over: Partial<AmountSeries> = {}): AmountSeries => ({
  bars: Array.from({ length: 30 }, (_, i) => ({
    day: `2026-10-${String(i + 1).padStart(2, '0')}` as DayKey,
    value: i % 3 === 0 ? 0 : 30,
    state: i % 2 ? 'met' : 'below',
  })),
  target: 30,
  norm: 0,
  total: 520,
  previousTotal: 400,
  delta: 120,
  better: true,
  ...over,
})

describe('AmountChart', () => {
  it('renders title, total, delta, bars and dashed line', () => {
    const html = wrap(<AmountChart series={amount()} direction="constructive" unit="minutes" />)
    expect(html).toContain('Последние 30 дней')
    expect(html).toContain('8 ч 40 мин')
    expect(html).toContain('+2 ч 0 мин')
    expect(html).toContain('bar-chart__delta--pos')
    expect(count(html, '<rect')).toBe(20)
    expect(html).toContain('bar-chart__dash')
    expect(html).toContain('Сегодня')
    expect(html).toContain('role="img"')
  })
  it('worse destructive delta is red and no line without norm', () => {
    const html = wrap(
      <AmountChart
        series={amount({ target: 0, norm: 0, delta: 5, better: false })}
        direction="destructive"
        unit="count"
      />,
    )
    expect(html).toContain('bar-chart__delta--neg')
    expect(html).not.toContain('bar-chart__dash')
  })
})

describe('MonthlyChart', () => {
  const months: MonthCount[] = Array.from({ length: 12 }, (_, i) => ({
    month: `2026-${String(i + 1).padStart(2, '0')}`,
    success: i,
    fail: i % 2,
    current: i === 11,
  }))
  it('stacked green successes and red misses, one title for both directions', () => {
    const html = wrap(<MonthlyChart months={months} direction="constructive" />)
    expect(html).toContain('Успехи и срывы по месяцам')
    expect(count(html, '<rect')).toBe(11 + 6)
    expect(html).toContain('bar-chart__bar--pos')
    expect(html).toContain('bar-chart__bar--neg-soft')
    expect(html).toContain('Выполнено')
    expect(html).toContain('Пропущено')
  })
  it('destructive legend: held / slipped', () => {
    const html = wrap(<MonthlyChart months={months} direction="destructive" />)
    expect(html).toContain('Держался')
    expect(html).toContain('Срыв')
  })
})

describe('WeeklyChart', () => {
  const series: WeeklySeries = {
    weeks: Array.from({ length: 16 }, (_, i) => ({
      weekStart: `2026-0${Math.floor(i / 4) + 1}-${String((i % 4) * 7 + 1).padStart(2, '0')}` as DayKey,
      count: i % 6,
      norm: 3,
      met: i % 6 >= 3,
    })),
    scale: { min: 0, max: 7 },
  }
  it('renders title, dashed norm and bars', () => {
    const html = wrap(<WeeklyChart series={series} direction="constructive" />)
    expect(html).toContain('По неделям')
    expect(html).toContain('bar-chart__dash')
    expect(html).toContain('bar-chart__bar--met')
    expect(html).toContain('bar-chart__bar--miss')
    expect(html).toContain('bar-chart__bar--pos')
  })
  it('destructive overflow is red', () => {
    expect(wrap(<WeeklyChart series={series} direction="destructive" />)).toContain('bar-chart__bar--neg')
  })
})
