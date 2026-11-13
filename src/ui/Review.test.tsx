import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthValue } from '../auth/context'
import { confirmDay } from '../db/db'
import { addDays, dayOf } from '../domain/day'
import type { Habit, HabitEntry, ZonedRule } from '../domain/types'
import { I18nProvider } from '../i18n'
import { Review } from './Review'

vi.mock('../db/db', async (orig) => ({ ...(await orig<typeof import('../db/db')>()), confirmDay: vi.fn() }))

const day = addDays(dayOf(new Date()), -1)
const next = addDays(day, 1)

const habit = (id: string, name: string, rule: ZonedRule, source?: Habit['source']): Habit => ({
  id, name, direction: 'constructive', active: true, effectiveFrom: '2026-01-01', createdAt: 1,
  versions: [{ from: '2026-01-01', tier: 'medium', rule }],
  ...(source ? { source } : {}),
})
const steps = habit('s', 'Шаги', { kind: 'measured', unit: 'steps', better: 'higher', excellent: 8000 }, { kind: 'garmin', metric: 'steps' })
const bed = habit('b', 'Отбой', { kind: 'measured', unit: 'time', better: 'lower', excellent: '23:00' }, { kind: 'garmin', metric: 'bedtime' })
const sport = habit('w', 'Тренировка', { kind: 'boolean' }, { kind: 'garmin', metric: 'activity', activityTypes: ['strength_training'] })
const unbound = habit('u', 'Читал', { kind: 'boolean' })
const habits = [steps, bed, sport, unbound]
const rows = [
  { day, steps: 11711, activities: [{ type: 'strength_training', minutes: 69 }] },
  { day: next, sleepStart: '23:03', activities: [] },
]
const signedIn = { session: {} } as unknown as AuthValue

const render = (opts: { existing?: { day: string; entries: Record<string, HabitEntry> }; rows?: typeof rows; onOpen?: boolean; viewDay?: string } = {}) =>
  renderToString(
    <AuthContext.Provider value={signedIn}>
      <I18nProvider>
        <Review
          day={opts.viewDay ?? day}
          maxDay={day}
          habits={habits}
          reviews={[]}
          existing={opts.existing as never}
          onDayChange={() => {}}
          onDone={() => {}}
          onOpenGarmin={opts.onOpen === false ? undefined : () => {}}
          garminRows={opts.rows ?? rows}
        />
      </I18nProvider>
    </AuthContext.Provider>,
  )

describe('Review Garmin hints', () => {
  it('shows banner, evidence for 3 bound habits and the day link', () => {
    const html = render()
    expect(html).toContain('3 ответа предложены по данным Garmin')
    expect(html).toContain('<b>11\u00a0711</b> шагов')
    expect(html).toContain('уснул в <b>23:03</b>')
    expect(html).toContain('<b>силовая · 69 мин</b>')
    expect(html).toContain('Данные Garmin за этот день ›')
    expect(html).toContain(`href="/garmin/${day}"`)
    expect(confirmDay).not.toHaveBeenCalled()
  })

  it('unbound habits get no hint and no preselection', () => {
    const html = render()
    expect(html).not.toContain('Garmin это не отслеживает')
    expect(html.match(/class="garmin-hint review-hint"/g)).toHaveLength(3)
    // The step input holds the suggested value; the unbound boolean habit has nothing selected.
    expect(html).toContain('value="11711"')
    const unboundCard = html.slice(html.indexOf('Читал'))
    expect(unboundCard).not.toContain('aria-checked="true"')
    expect(unboundCard).not.toContain('aria-pressed="true"')
  })

  it('no data: no banner and no hints', () => {
    const html = render({ rows: [] })
    expect(html).not.toContain('Garmin:')
    expect(html).not.toContain('предложен')
  })

  it('confirmed or locked day gets no prefill', () => {
    expect(render({ existing: { day, entries: {} } })).not.toContain('предложен')
    expect(render({ viewDay: '2020-01-01' })).not.toContain('предложен')
  })
})
