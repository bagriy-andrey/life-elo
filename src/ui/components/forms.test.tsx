import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ChipGroup, SegmentedControl, Select, Stepper, TypeCards, WeekDots } from './index'

describe('form components', () => {
  it('Stepper disables buttons at the bounds and labels them', () => {
    const html = renderToString(<Stepper value={1} min={1} max={7} onChange={() => {}} decLabel="Меньше" incLabel="Больше" label="Дней" />)
    expect(html).toContain('aria-label="Меньше"')
    expect(html).toContain('aria-label="Больше"')
    expect(html).toContain('Дней')
    expect(html.match(/disabled=""/g)).toHaveLength(1)
  })
  it('WeekDots renders 7 dots with direction tones', () => {
    const good = renderToString(<WeekDots value={3} direction="constructive" />)
    expect(good.match(/week-dot /g)).toHaveLength(7)
    expect(good.match(/week-dot-pos/g)).toHaveLength(3)
    expect(good.match(/week-dot-rest/g)).toHaveLength(4)
    const bad = renderToString(<WeekDots value={2} direction="destructive" />)
    expect(bad.match(/week-dot-allowed/g)).toHaveLength(2)
    expect(bad.match(/week-dot-over/g)).toHaveLength(5)
  })
  it('Select renders a closed listbox trigger with the selected label', () => {
    const options = [{ value: '', label: 'Не уменьшается' }, { value: 'h1', label: 'Курение' }]
    const html = renderToString(<Select label="Уменьшается" value="h1" onChange={() => {}} options={options} />)
    expect(html).toContain('aria-haspopup="listbox"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('aria-label="Уменьшается"')
    expect(html).toContain('Курение')
    expect(html).not.toContain('role="listbox"')
    const empty = renderToString(<Select label="x" value="zzz" placeholder="Выберите" onChange={() => {}} options={options} />)
    expect(empty).toContain('select-value placeholder')
  })
  it('ChipGroup is a radiogroup with the selected chip checked', () => {
    const html = renderToString(<ChipGroup label="Как отмечать" value="b" onChange={() => {}} options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} />)
    expect(html).toContain('role="radiogroup"')
    expect(html).toContain('aria-label="Как отмечать"')
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1)
  })
  it('TypeCards marks the selected card and supports disabled', () => {
    const options = [
      { value: 'c', title: 'Конструктивная', description: 'd1', tone: 'pos' as const },
      { value: 'd', title: 'Нежелательная', description: 'd2', tone: 'neg' as const },
    ]
    const html = renderToString(<TypeCards label="Тип" options={options} value="d" onChange={() => {}} disabled />)
    expect(html).toContain('type-card on tone-neg')
    expect(html.match(/disabled=""/g)).toHaveLength(2)
    expect(html).toContain('Конструктивная')
  })
  it('SegmentedControl renders importance bars only for options with bars', () => {
    const html = renderToString(<SegmentedControl value="a" onChange={() => {}} options={[{ value: 'a', label: 'A', bars: 2 }, { value: 'b', label: 'B' }]} />)
    expect(html.match(/segmented-bars/g)).toHaveLength(1)
    expect(html.match(/segmented-bar bar-/g)).toHaveLength(3)
    expect(html.match(/ dim/g)).toHaveLength(1)
  })
})
