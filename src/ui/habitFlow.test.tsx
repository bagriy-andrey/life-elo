import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { DayReview, Habit, HabitVersion } from '../domain/types'
import { I18nProvider } from '../i18n'
import { HabitPage } from './HabitPage'
import { HabitSheet } from './HabitSheet'
import { Habits } from './Habits'

const TODAY = '2026-11-09'
const FROM = '2026-01-01'

const habit = (id: string, name: string, over: Partial<Habit> = {}, version: Partial<HabitVersion> = {}): Habit => ({
  id,
  name,
  direction: 'constructive',
  versions: [{ from: FROM, tier: 'medium', rule: { kind: 'boolean' }, ...version }],
  active: true,
  effectiveFrom: FROM,
  createdAt: 1,
  ...over,
})

const habits: Habit[] = [
  habit('a', 'Зарядка'),
  habit('b', 'Соцсети', { direction: 'destructive' }, { tier: 'strong' }),
  habit('c', 'Чтение', {}, { tier: 'weak', rule: { kind: 'measured', unit: 'minutes', better: 'higher', excellent: 30 } }),
  habit('d', 'Сон', {}, { rule: { kind: 'measured', unit: 'time', better: 'lower', excellent: '22:30', tolerable: '23:00' } }),
  habit('e', 'Зал', { active: false }, { weeklyGoal: { perWeek: 3 } }),
]
const values: Record<string, boolean | number | string> = { a: true, b: false, c: 40, d: '22:20', e: true }
const reviews: DayReview[] = ['2026-11-01', '2026-11-03', '2026-11-05', '2026-11-07', '2026-11-08'].map(
  (day) =>
    ({
      day,
      entries: Object.fromEntries(habits.map((h) => [h.id, { kind: 'value', value: values[h.id] }])),
    }) as unknown as DayReview,
)

const wrap = (node: React.ReactNode) => renderToString(<I18nProvider>{node}</I18nProvider>)

describe('habit flow smoke render', () => {
  vi.stubGlobal('document', { activeElement: null })

  it('list shows every habit and the paused badge', () => {
    const html = wrap(<Habits habits={habits} reviews={reviews} effectiveFrom={FROM} />)
    for (const h of habits) expect(html).toContain(h.name)
    expect(html).toContain('Пауза')
  })

  it.each(habits.map((h) => [h.name, h] as const))('page renders for %s', (name, h) => {
    const html = wrap(
      <HabitPage habit={h} habits={habits} reviews={reviews} effectiveFrom={FROM} today={TODAY} onBack={() => {}} />,
    )
    expect(html).toContain(`<h1>${name}</h1>`)
    expect(html).toContain('heatmap-grid')
    expect(html).toContain('weekday-bars')
  })

  it('edit sheet renders over the same fixtures', () => {
    const html = wrap(
      <HabitSheet habit={habits[2]} habits={habits} reviews={reviews} effectiveFrom={FROM} onClose={() => {}} />,
    )
    expect(html).toContain('Чтение')
  })

})
