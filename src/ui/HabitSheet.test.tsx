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

  it('locked habit shows the direction note', () => {
    expect(render(base(), answered)).toContain('Направление нельзя поменять')
  })
})
