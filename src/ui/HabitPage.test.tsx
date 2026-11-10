import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { DayReview, Habit, HabitVersion } from '../domain/types'
import { I18nProvider } from '../i18n'
import { HabitPage } from './HabitPage'

const TODAY = '2026-11-09'

const habit = (name: string, over: Partial<Habit> = {}, version: Partial<HabitVersion> = {}): Habit => ({
  id: 'h',
  name,
  direction: 'constructive',
  versions: [{ from: '2026-01-01', tier: 'medium', rule: { kind: 'boolean' }, ...version }],
  active: true,
  effectiveFrom: '2026-01-01',
  createdAt: 1,
  ...over,
})

const reviewsOf = (value: boolean | number | string): DayReview[] =>
  ['2026-11-01', '2026-11-03', '2026-11-05', '2026-11-07', '2026-11-08'].map(
    (day) => ({ day, entries: { h: { kind: 'value', value } } }) as unknown as DayReview,
  )

const page = (h: Habit | undefined, reviews: DayReview[]) =>
  renderToString(
    <I18nProvider>
      <HabitPage habit={h} habits={h ? [h] : []} reviews={reviews} effectiveFrom="2026-01-01" today={TODAY} onBack={() => {}} />
    </I18nProvider>,
  )

describe('HabitPage smoke render', () => {
  vi.stubGlobal('document', { activeElement: null })

  const common = (html: string, name: string) => {
    expect(html).toContain(`<h1>${name}</h1>`)
    expect(html).toContain('Назад')
    expect(html).toContain('Лучшая серия')
    expect(html).toContain('Выполнение')
    expect(html).toContain('habit-page-card')
    expect(html).toContain('heatmap-grid')
    expect(html).toContain('weekday-bars')
  }

  it('renders nothing without a habit', () => {
    expect(page(undefined, [])).toBe('')
  })

  it('daily yes/no constructive', () => {
    const html = page(habit('Зарядка'), reviewsOf(true))
    common(html, 'Зарядка')
    expect(html).toContain('Текущая серия')
    expect(html).toContain('Успехи и срывы по месяцам')
    expect(html).toContain('weekday-bars__col--today')
    expect(html).not.toContain('weekday-bars__pct')
    expect(html).not.toContain('weekday-bars__caption')
  })

  it('daily yes/no destructive shows the holding label and slips chart', () => {
    const html = page(habit('Соцсети', { direction: 'destructive' }), reviewsOf(false))
    common(html, 'Соцсети')
    expect(html).toContain('Держусь')
    expect(html).toContain('Успехи и срывы по месяцам')
    expect(html).toContain('Срыв')
  })

  it('minutes', () => {
    const h = habit('Чтение', {}, { rule: { kind: 'measured', unit: 'minutes', better: 'higher', excellent: 30 } })
    const html = page(h, reviewsOf(40))
    common(html, 'Чтение')
    expect(html).toContain('Последние 30 дней')
    expect(html).toContain('weekday-bars__caption">мин<')
    expect(html).toContain('weekday-bars__bar--pos')
    expect(html).not.toContain('% успешных дней')
  })

  it('steps: no weekday bars', () => {
    const h = habit('Шаги', {}, { rule: { kind: 'measured', unit: 'steps', better: 'higher', excellent: 8000 } })
    const html = page(h, reviewsOf(9000))
    expect(html).toContain('Последние 30 дней')
    expect(html).toContain('heatmap-grid')
    expect(html).not.toContain('weekday-bars')
  })

  it('count destructive: red heatmap and weekday shades', () => {
    const h = habit('Кофе', { direction: 'destructive' }, {
      rule: { kind: 'measured', unit: 'count', better: 'lower', excellent: 0, ok: 2 },
    })
    const html = page(h, reviewsOf(3))
    common(html, 'Кофе')
    expect(html).toContain('heatmap heatmap--neg')
    expect(html).toContain('weekday-bars__bar--neg')
    expect(html).toContain('weekday-bars__caption">раз<')
  })

  it('time with tolerable', () => {
    const h = habit('Сон', {}, {
      rule: { kind: 'measured', unit: 'time', better: 'lower', excellent: '22:30', tolerable: '23:00' },
    })
    const html = page(h, reviewsOf('22:20'))
    common(html, 'Сон')
    expect(html).toContain('time-chart__zone--tolerable')
    expect(html).toContain('heatmap-cell--pos')
    expect(html).toContain('22:20')
  })

  it('weekly yes/no, paused badge', () => {
    const h = habit('Зал', { active: false }, { weeklyGoal: { perWeek: 3 } })
    const html = page(h, reviewsOf(true))
    common(html, 'Зал')
    expect(html).toContain('По неделям')
    expect(html).toContain('habit-page-badge')
  })
})
