import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { DayKey, Habit, HabitEntry } from '../domain/types'
import { I18nProvider } from '../i18n'
import { YesterdayDone } from './YesterdayDone'
import { YesterdayReview } from './YesterdayReview'

const day = '2026-11-03' as DayKey
const habit = (id: string, name: string, createdAt: number, extra: Partial<Habit> = {}) =>
  ({
    id, name, direction: 'constructive', active: true, effectiveFrom: '2026-01-01', createdAt,
    versions: [{ from: '2026-01-01', rule: { kind: 'boolean' } }],
    ...extra,
  }) as unknown as Habit

const render = (
  rating: number,
  habits: Habit[],
  initialState?: { answers?: Record<string, HabitEntry>; screen?: 'cards' | 'summary' | 'done'; index?: number; fromGarmin?: string[] },
) =>
  renderToString(
    <I18nProvider>
      <YesterdayReview day={day} habits={habits} reviews={[]} rating={rating} onClose={() => {}} initialState={initialState} />
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

const measured = (id: string, name: string, createdAt: number, unit: string, excellent: number | string, better: 'lower' | 'higher', extra: Partial<Habit> = {}) =>
  habit(id, name, createdAt, {
    versions: [{ from: '2026-01-01', rule: { kind: 'measured', unit, better, excellent } }],
    ...extra,
  } as unknown as Partial<Habit>)

describe('YesterdayReview stage B, summary, done', () => {
  const steps = measured('s', 'Шаги', 1, 'steps', 8000, 'higher')
  const sleep = measured('t', 'Отбой', 2, 'time', '23:00', 'lower')
  const quota = habit('q', 'Кофе', 3, {
    direction: 'destructive',
    versions: [{ from: '2026-01-01', rule: { kind: 'boolean' }, quota: { perDay: 3 } }],
  } as unknown as Partial<Habit>)
  const weekly = habit('w', 'Сладкое', 4, {
    direction: 'destructive',
    versions: [{ from: '2026-01-01', rule: { kind: 'boolean' }, quota: { perWeek: 2 } }],
  } as unknown as Partial<Habit>)

  it('numeric card shows stepper, goal and N/A', () => {
    const html = render(0, [steps])
    expect(html).toContain('Шаги')
    expect(html).toContain('Цель: 8')
    expect(html).toContain('Меньше')
    expect(html).toContain('Не применимо')
    expect(html).toContain('<h2')
  })

  it('time card shows the HH:MM field and goal', () => {
    const html = render(0, [sleep])
    expect(html).toContain('Время, ЧЧ:ММ')
    expect(html).toContain('Цель: не позже 23:00')
  })

  it('quota numeric card asks how many', () => {
    expect(render(0, [quota])).toContain('Сколько раз?')
  })

  it('yes/no quota card shows weekly dots', () => {
    const html = render(0, [weekly])
    expect(html).toContain('Использовано 0 из 2')
  })

  it('weekly-goal card shows the week progress note', () => {
    const goal = habit('g', 'Спорт', 5, {
      versions: [{ from: '2026-01-01', tier: 'medium', rule: { kind: 'boolean' }, weeklyGoal: { perWeek: 3 } }],
    } as unknown as Partial<Habit>)
    expect(render(0, [goal])).toContain('На этой неделе: 0 из 3')
  })

  it('summary lists answers with tone and hides progress', () => {
    const habits = [habit('a', 'Зарядка', 1), steps, sleep, weekly]
    const html = render(0, habits, {
      screen: 'summary',
      index: 4,
      answers: {
        a: { kind: 'value', value: true },
        s: { kind: 'value', value: 9000 },
        t: { kind: 'not_applicable' },
        w: { kind: 'value', value: 1 },
      },
    })
    expect(html).toContain('Проверьте ответы')
    expect(html).toContain('Сделал')
    expect(html).toContain('Было')
    expect(html).toContain('Сохранить день')
    expect(html).not.toContain('из 4')
    expect(html).toContain('yr-tone-pos')
  })

  it('done screen shows delta, score and streak changes', () => {
    const html = renderToString(
      <I18nProvider>
        <YesterdayDone
          habits={[habit('a', 'Зарядка', 1)]}
          onContinue={() => {}}
          outcome={{ delta: 1.5, ratingAfter: 4, dayScore: 0.7, expected: 0.4, streaksGrew: [{ habitId: 'a', pos: 3 }], streaksBroke: [] }}
        />
      </I18nProvider>,
    )
    expect(html).toContain('Вчерашний день отмечен')
    expect(html).toContain('+1.5')
    expect(html).toContain('Зарядка: 3 дня подряд')
    expect(html).toContain('Продолжить')
  })
})

describe('YesterdayReview Garmin prefill', () => {
  const steps = measured('s', 'Шаги', 1, 'steps', 8000, 'higher')
  const run = habit('r', 'Бег', 2)
  it('numeric card shows prefilled value and the Garmin hint', () => {
    const html = render(0, [steps], { answers: { s: { kind: 'value', value: 9123 } }, fromGarmin: ['s'] })
    expect(html).toContain('9123')
    expect(html).toContain('из Garmin')
  })
  it('boolean card shows the Garmin hint', () => {
    const html = render(0, [run], { answers: { r: { kind: 'value', value: true } }, fromGarmin: ['r'] })
    expect(html).toContain('из Garmin')
  })
  it('no hint without Garmin answers', () => {
    expect(render(0, [steps], { answers: { s: { kind: 'value', value: 9123 } } })).not.toContain('из Garmin')
  })
})
