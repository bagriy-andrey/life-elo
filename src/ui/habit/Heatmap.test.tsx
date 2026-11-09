import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { heatmapGrid } from '../../domain/habitCharts'
import type { ChartKind } from '../../domain/habitStats'
import type { Habit, HabitDirection } from '../../domain/types'
import { I18nProvider } from '../../i18n'
import { Heatmap } from './Heatmap'

const TODAY = '2026-11-11'
const habit = (rule: object, direction: HabitDirection = 'constructive', weeklyGoal?: object): Habit =>
  ({
    id: 'h',
    name: 'X',
    direction,
    versions: [{ from: '2026-01-01', tier: 'medium', rule, ...(weeklyGoal ? { weeklyGoal } : {}) }],
    active: true,
    effectiveFrom: '2026-01-01',
    createdAt: 1,
  }) as unknown as Habit

const render = (h: Habit, kind: ChartKind) =>
  renderToString(
    <I18nProvider>
      <Heatmap grid={heatmapGrid(h, [], TODAY)} kind={kind} direction={h.direction} />
    </I18nProvider>,
  )

const columns = (html: string) => (html.match(/class="heatmap-col"/g) ?? []).length

describe('Heatmap smoke render', () => {
  it('yes/no: 53 columns, labelled colours, no strip', () => {
    const html = render(habit({ kind: 'boolean' }), 'yesno')
    expect(columns(html)).toBe(53)
    expect(html).toContain('Выполнено')
    expect(html).toContain('Пропущено')
    expect(html).not.toContain('heatmap-strip')
  })
  it('destructive yes/no uses held/slipped', () => {
    const html = render(habit({ kind: 'boolean' }, 'destructive'), 'yesno')
    expect(html).toContain('Держался')
    expect(html).toContain('Срыв')
  })
  it('amount: scale legend', () => {
    const html = render(habit({ kind: 'measured', unit: 'minutes', better: 'higher', excellent: 30, tolerable: 15 }), 'amount')
    expect(columns(html)).toBe(53)
    expect(html).toContain('Меньше')
    expect(html).toContain('Больше')
  })
  it('time: earlier/later legend', () => {
    const html = render(habit({ kind: 'measured', unit: 'time', better: 'lower', excellent: 420, tolerable: 450 }), 'time')
    expect(html).toContain('Раньше')
    expect(html).toContain('Позже')
  })
  it('weekly: strip under each column', () => {
    const html = render(habit({ kind: 'boolean' }, 'constructive', { perWeek: 3 }), 'weekly')
    expect(columns(html)).toBe(53)
    expect((html.match(/class="heatmap-strip /g) ?? []).length).toBe(53)
    expect(html).toContain('Норма недели выполнена')
  })
})
