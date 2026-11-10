import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { HabitNorms } from '../../domain/habitStats'
import type { Habit } from '../../domain/types'
import { I18nProvider } from '../../i18n'
import { WeekdayBars } from './WeekdayBars'
import { amountBars, percentBars, timeBars, type WeekdayBar } from './weekdayData'

const render = (bars: WeekdayBar[], caption?: string) =>
  renderToString(
    <I18nProvider>
      <WeekdayBars bars={bars} caption={caption} />
    </I18nProvider>,
  )

const habit = (direction: Habit['direction']) => ({ direction }) as Habit

describe('weekdayData', () => {
  it('percentBars: best bright, rest dim; labels only on request', () => {
    const bars = percentBars([50, 80, 70, 20, null, 0, 65], false)
    expect(bars.filter((b) => b.fill === 'best')).toHaveLength(1)
    expect(bars[1]).toEqual({ ratio: 0.8, label: undefined, fill: 'best' })
    expect(bars[4].ratio).toBeNull()
    expect(percentBars([50, null, null, null, null, null, null], true)[1].label).toBe('—')
    expect(percentBars([0, null, null, null, null, null, null], false).some((b) => b.fill === 'best')).toBe(false)
  })
  it('timeBars: height = %, label = average time, colour = zone of the average', () => {
    const norms: HabitNorms = { unit: 'time', better: 'lower', target: 420, tolerableBound: 450 }
    const bars = timeBars([90, 50, 10, null, null, null, null], [410, 440, 470, null, null, null, null], norms, String)
    expect(bars.slice(0, 3).map((b) => b.fill)).toEqual(['pos', 'warn', 'neg'])
    expect(bars[0]).toMatchObject({ ratio: 0.9, label: '410' })
    expect(bars[3]).toMatchObject({ ratio: null, label: '—', fill: 'dim' })
  })
  it('amountBars: height relative to the max average; green or red shades by habit type', () => {
    const good: HabitNorms = { unit: 'minutes', better: 'higher', target: 60 }
    const g = amountBars([30, 60, 90, null, 0, 0, 0], habit('constructive'), good, (v) => String(v))
    expect(g.slice(0, 3).map((b) => b.fill)).toEqual(['pos2', 'pos3', 'pos4'])
    expect(g[2].ratio).toBe(1)
    expect(g[3]).toMatchObject({ ratio: null, fill: 'dim' })
    const bad: HabitNorms = { unit: 'count', better: 'lower', limit: 2 }
    const d = amountBars([1, 3, null, null, null, null, null], habit('destructive'), bad, (v) => String(v))
    expect(d.slice(0, 2).map((b) => b.fill)).toEqual(['neg2', 'neg4'])
  })
})

describe('WeekdayBars', () => {
  it('renders 7 bars with fills, labels and caption', () => {
    const html = render(percentBars([50, 80, 70, 20, null, 0, 65], true), 'в среднем, мин')
    expect(html.match(/weekday-bars__col/g)).toHaveLength(7)
    expect(html.match(/weekday-bars__bar--best/g)).toHaveLength(1)
    expect(html).toContain('80%')
    expect(html).toContain('По дням недели')
    expect(html).toContain('в среднем, мин')
  })
  it('no labels and no caption when not given', () => {
    const html = render(percentBars([50, 80, 70, 20, null, 0, 65], false))
    expect(html).not.toContain('weekday-bars__pct')
    expect(html).not.toContain('weekday-bars__caption')
  })
})
