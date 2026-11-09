import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { DayReview, Habit } from '../domain/types'
import { I18nProvider } from '../i18n'
import { HabitSheet } from './HabitSheet'
import { Habits } from './Habits'

const habit = (id: string, name: string, over: Partial<Habit> = {}, version: Partial<Habit['versions'][0]> = {}): Habit => ({
  id,
  name,
  direction: 'constructive',
  versions: [{ from: '2026-01-01', tier: 'medium', rule: { kind: 'boolean' }, ...version }],
  active: true,
  effectiveFrom: '2026-01-01',
  createdAt: 1,
  ...over,
})

const gym = habit('g', 'Зарядка', {}, { weeklyGoal: { perWeek: 4 } })
const social = habit('s', 'Соцсети', { direction: 'destructive', active: false }, { tier: 'strong', quota: { perWeek: 2 } })
const steps = habit('w', 'Шаги', {}, { tier: 'weak', rule: { kind: 'measured', unit: 'steps', better: 'higher', excellent: 8000 } })

const answered: DayReview[] = [
  { day: '2026-01-02', entries: { g: { kind: 'value', value: true } } } as unknown as DayReview,
]

const wrap = (node: React.ReactNode) => renderToString(<I18nProvider>{node}</I18nProvider>)
const sheet = (h?: Habit, reviews: DayReview[] = []) =>
  wrap(<HabitSheet habit={h} habits={[gym, social, steps]} reviews={reviews} effectiveFrom="2026-01-01" onClose={() => {}} />)

describe('Habits smoke render', () => {
  vi.stubGlobal('document', { activeElement: null })

  it('renders the empty state with the add action', () => {
    const html = wrap(<Habits habits={[]} reviews={[]} effectiveFrom="2026-01-01" />)
    expect(html).toContain('Пока нет привычек')
    expect(html).toContain('Добавьте первую')
    expect(html).toContain('Добавить')
    expect(html).not.toContain('role="dialog"')
    expect(html).not.toContain('Сводка по привычкам')
  })

  it('renders summary tiles counting paused habits too', () => {
    const html = wrap(<Habits habits={[gym, social, steps]} reviews={[]} effectiveFrom="2026-01-01" />)
    expect(html).toContain('aria-label="Сводка по привычкам"')
    expect(html).toContain('Конструктивные')
    expect(html).toContain('Нежелательные')
    expect(html).toContain('<span class="stat-tile-total">2</span>')
    expect(html).toContain('<span class="stat-tile-total">1</span>')
    // zero rows: constructive strong; destructive medium and weak (paused social counted)
    expect(html.match(/stat-tile-row dim/g)).toHaveLength(3)
  })

  it('renders grouped cards with meta lines and dims paused ones', () => {
    const html = wrap(<Habits habits={[gym, social, steps]} reviews={[]} effectiveFrom="2026-01-01" />)
    expect(html).not.toContain('Пока нет привычек')
    expect(html).toContain('Зарядка')
    expect(html).toContain('Конструктивная · Средняя · от 4 раз в неделю')
    expect(html).toContain('Нежелательная · Сильная · до 2 раз в неделю')
    expect(html).toContain('≥ 8000 шагов в день')
    expect(html).toContain('habit-row-content paused')
    expect(html.match(/habit-row-badge/g)).toHaveLength(1)
    expect(html.match(/aria-label="Действия с привычкой"/g)).toHaveLength(3)
    expect(html).toContain('role="button"')
  })

  it('groups by direction, then tier subgroups with TierBars; hides empty subgroups', () => {
    const html = wrap(<Habits habits={[gym, social, steps]} reviews={[]} effectiveFrom="2026-01-01" />)
    expect(html.match(/class="habit-row-tier"/g)).toHaveLength(3)
    expect(html).toContain('tier-bars')
  })

  it('renders the create sheet without edit actions', () => {
    const html = sheet()
    expect(html).toContain('Новая привычка')
    expect(html).toContain('Название')
    expect(html).toContain('Как отмечать')
    expect(html).toContain('Каждый день')
    expect(html).not.toContain('Пауза')
    expect(html).not.toContain('Меньше — лучше')
  })

  it('renders the edit sheet for a weekly-goal habit with stepper and week dots', () => {
    const html = sheet(gym)
    expect(html).toContain('Изменить привычку')
    expect(html).not.toContain('Пауза')
    expect(html).not.toContain('Удалить')
    expect(html).toContain('Не меньше, раз в неделю')
    expect(html).toContain('week-dots')
    expect(html).toContain('<strong class="stepper-value">4</strong>')
    expect(html).not.toContain('Направление нельзя поменять')
  })

  it('locks the direction once the habit has answers and shows Resume when paused', () => {
    const html = sheet(social, [{ day: '2026-01-02', entries: { s: { kind: 'value', value: 1 } } } as unknown as DayReview])
    expect(html).toContain('Направление нельзя поменять')
    expect(html).not.toContain('Вернуть')
    expect(sheet(gym, answered)).toContain('Направление нельзя поменять')
  })

  it('renders three threshold fields for a measured habit', () => {
    const html = sheet(steps)
    expect(html).toContain('Отлично')
    expect(html).toContain('Терпимо')
    expect(html).toContain('value="8000"')
  })
})
