import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { DayReview, Habit } from '../domain/types'
import { I18nProvider } from '../i18n'
import { HabitSheet } from './HabitSheet'

const base = (over: Partial<Habit['versions'][0]> = {}): Habit => ({
  id: 'h',
  name: 'Подъём',
  direction: 'constructive',
  versions: [{ from: '2026-01-01', tier: 'medium', rule: { kind: 'boolean' }, ...over }],
  active: true,
  effectiveFrom: '2026-01-01',
  createdAt: 1,
})
const timeHabit = base({
  rule: { kind: 'measured', unit: 'time', better: 'lower', excellent: 420, tolerable: 450 } as never,
})
const answered = [{ day: '2026-01-02', entries: { h: { kind: 'value', value: true } } }] as unknown as DayReview[]

const render = (h: Habit, reviews: DayReview[] = []) =>
  renderToString(
    <I18nProvider>
      <HabitSheet habit={h} habits={[h]} reviews={reviews} effectiveFrom="2026-01-01" onClose={() => {}} />
    </I18nProvider>,
  )

describe('HabitSheet smoke render', () => {
  it('edit mode has Save but no Delete/Pause', () => {
    const html = render(base())
    expect(html).toContain('Сохранить')
    expect(html).not.toContain('Удалить')
    expect(html).not.toContain('Пауза')
  })

  it('time habit shows «Терпимо до» and the hint', () => {
    const html = render(timeHabit)
    expect(html).toContain('Терпимо до')
    expect(html).toContain('терпимо, позже')
  })

  it('shows the Garmin source for a linked steps habit', () => {
    const h: Habit = {
      ...base({ rule: { kind: 'measured', unit: 'steps', better: 'higher', excellent: 10000 } as never }),
      source: { kind: 'garmin', metric: 'steps' },
    }
    const html = render(h)
    expect(html).toContain('Источник')
    expect(html).toContain('Garmin')
  })

  it('shows activity types for a linked boolean habit', () => {
    const h: Habit = { ...base(), source: { kind: 'garmin', metric: 'activity', activityTypes: ['yoga'] } }
    const html = render(h)
    expect(html).toContain('Виды активности')
    expect(html).toContain('Йога')
    expect(html).toContain('Силовая')
  })

  it('hides the source control when no metric is compatible', () => {
    const h = base({ rule: { kind: 'measured', unit: 'count', better: 'lower', excellent: 1 } as never })
    expect(render(h)).not.toContain('Источник')
  })

  it('locked habit shows the direction note', () => {
    expect(render(base(), answered)).toContain('Направление нельзя поменять')
  })
})
