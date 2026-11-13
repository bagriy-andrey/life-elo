import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StackedBar } from './StackedBar'

const fmt = (v: number) => `${v}s`
const render = (segments: { key: string; label: string; value: number }[]) =>
  renderToString(<StackedBar segments={segments} format={fmt} label="Stages" />)

describe('StackedBar', () => {
  it('renders empty when all zero', () => {
    const html = render([{ key: 'a', label: 'Deep', value: 0 }])
    expect(html).not.toContain('stacked-bar__legend')
  })
  it('renders segments, values and percentages; hides zero segments', () => {
    const html = render([
      { key: 'a', label: 'Deep', value: 100 },
      { key: 'b', label: 'Light', value: 300 },
      { key: 'c', label: 'Awake', value: 0 },
    ])
    expect(html).toContain('Deep')
    expect(html).toContain('Light')
    expect(html).not.toContain('Awake')
    expect(html).toContain('25%')
    expect(html).toContain('75%')
    expect(html).toContain('300s')
    expect(html).toContain('aria-label="Stages"')
  })
})
