import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { DayKey, Habit } from '../domain/types'
import { I18nProvider } from '../i18n'
import { YesterdayReview } from './YesterdayReview'

const day = '2026-11-03' as DayKey
const habit = (id: string, name: string, createdAt: number, extra: Partial<Habit> = {}) =>
  ({
    id, name, direction: 'constructive', active: true, effectiveFrom: '2026-01-01', createdAt,
    versions: [{ from: '2026-01-01', rule: { kind: 'boolean' } }],
    ...extra,
  }) as unknown as Habit

const render = (rating: number, habits: Habit[]) =>
  renderToString(
    <I18nProvider>
      <YesterdayReview day={day} habits={habits} reviews={[]} rating={rating} />
    </I18nProvider>,
  )

describe('YesterdayReview smoke render', () => {
  const habits = [habit('b', 'Вторая', 2), habit('a', 'Зарядка', 1)]

  it('shows first card, counter and rating hint when rating > 0', () => {
    const html = render(5, habits)
    expect(html).toContain('Зарядка')
    expect(html).toContain('1 из 2')
    expect(html).toContain('серии прервутся, рейтинг снизится.')
    expect(html).toContain('aria-modal="true"')
  })

  it('omits rating hint when rating <= 0', () => {
    const html = render(0, habits)
    expect(html).toContain('серии прервутся.')
    expect(html).not.toContain('рейтинг снизится')
  })
})
