import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { DayCell, HabitNorms } from '../../domain/habitStats'
import type { Habit } from '../../domain/types'
import { I18nProvider } from '../../i18n'
import { WeekdayBars } from './WeekdayBars'
import { amountBars, historyFrom, outcomeBars, timeBars, type WeekdayBar } from './weekdayData'

// 2026-11-10 is a Tuesday: the window is Wed 11-04 .. Tue 11-10 (today, not reviewed yet).
const TODAY = '2026-11-10'
const days = ['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', TODAY]
const cells = (xs: (Omit<DayCell, 'day'> | null)[]): DayCell[] =>
  xs.map((x, i) => ({ day: days[i], ...(x ?? { status: 'nodata' as const }) }))
const habit = (direction: Habit['direction']) => ({ direction }) as Habit

const render = (bars: WeekdayBar[], caption?: string) =>
  renderToString(
    <I18nProvider>
      <WeekdayBars bars={bars} caption={caption} />
    </I18nProvider>,
  )

describe('weekdayData', () => {
  it('window: 7 days ending today', () => {
    expect(historyFrom(TODAY)).toBe('2026-11-04')
  })
  it('outcomeBars: success green, miss red, rest empty; weekly colours event days only', () => {
    const cs = cells([
      { status: 'success', value: true },
      { status: 'fail', value: false },
      { status: 'skipped' },
      null,
      null,
      null,
      { status: 'future' },
    ])
    const b = outcomeBars(cs, 'yesno', 'constructive')
    expect(b.slice(0, 3).map((x) => [x.ratio, x.fill])).toEqual([
      [1, 'pos'],
      [1, 'neg'],
      [null, 'dim'],
    ])
    expect(b[6]).toMatchObject({ day: TODAY, ratio: null })
    expect(outcomeBars(cs, 'weekly', 'constructive').map((x) => x.fill).slice(0, 2)).toEqual(['pos', 'dim'])
    expect(outcomeBars(cs, 'weekly', 'destructive').map((x) => x.fill).slice(0, 2)).toEqual(['dim', 'neg'])
  })
  it('timeBars: zone colour and the time above', () => {
    const norms: HabitNorms = { unit: 'time', better: 'lower', target: 420, tolerableBound: 450 }
    const cs = cells([
      { status: 'success', value: '06:50' },
      { status: 'tolerable', value: '07:20' },
      { status: 'fail', value: '07:50' },
      null,
      null,
      null,
      { status: 'future' },
    ])
    const b = timeBars(cs, norms, String)
    expect(b.slice(0, 3).map((x) => x.fill)).toEqual(['pos', 'warn', 'neg'])
    expect(b[0]).toMatchObject({ ratio: 1, label: '410' })
    expect(b[6]).toMatchObject({ ratio: null, label: '—' })
  })
  it('amountBars: height relative to the biggest day, green or red shades by habit type', () => {
    const good: HabitNorms = { unit: 'minutes', better: 'higher', target: 60 }
    const cs = cells([
      { status: 'fail', value: 30 },
      { status: 'success', value: 60 },
      { status: 'success', value: 90 },
      null,
      null,
      null,
      { status: 'future' },
    ])
    const g = amountBars(cs, habit('constructive'), good, String)
    expect(g.slice(0, 3).map((x) => x.fill)).toEqual(['pos2', 'pos3', 'pos4'])
    expect(g[2].ratio).toBe(1)
    expect(g[3]).toMatchObject({ ratio: null, label: '—' })
    const bad: HabitNorms = { unit: 'count', better: 'lower', limit: 2 }
    const d = amountBars(
      cells([{ status: 'success', value: 1 }, { status: 'fail', value: 3 }, null, null, null, null, null]),
      habit('destructive'),
      bad,
      String,
    )
    expect(d.slice(0, 2).map((x) => x.fill)).toEqual(['neg2', 'neg4'])
  })
})

describe('WeekdayBars', () => {
  it('7 bars, today last and highlighted, labels and caption', () => {
    const norms: HabitNorms = { unit: 'minutes', better: 'higher', target: 60 }
    const bars = amountBars(cells([{ status: 'success', value: 45 }, null, null, null, null, null, null]), habit('constructive'), norms, String)
    const html = render(bars, 'мин')
    expect(html.match(/weekday-bars__col/g)).toHaveLength(7 + 1) // + the --today modifier
    expect(html.match(/weekday-bars__col--today/g)).toHaveLength(1)
    expect(html).toContain('45')
    expect(html).toContain('мин')
  })
  it('no labels and no caption for yes/no', () => {
    const html = render(outcomeBars(cells([{ status: 'success', value: true }, null, null, null, null, null, null]), 'yesno', 'constructive'))
    expect(html).not.toContain('weekday-bars__pct')
    expect(html).not.toContain('weekday-bars__caption')
  })
})
