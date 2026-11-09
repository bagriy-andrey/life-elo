import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SegmentedControl, StatTile } from './index'

describe('StatTile', () => {
  const rows = [
    { label: 'Сильные', value: 2, level: 3 as const },
    { label: 'Средние', value: 0, level: 2 as const },
    { label: 'Слабые', value: 1, level: 1 as const },
  ]
  it('renders title, total, rows, tone dot and dims zero rows', () => {
    const html = renderToString(<StatTile title="Конструктивные" total={3} tone="pos" rows={rows} />)
    expect(html).toContain('Конструктивные')
    expect(html).toContain('stat-tile-total">3<')
    for (const r of rows) expect(html).toContain(r.label)
    expect(html).toContain('stat-tile-dot-pos')
    expect(html.match(/stat-tile-row dim/g)).toHaveLength(1)
    expect(html.match(/tier-bars-sm/g)).toHaveLength(3)
    expect(renderToString(<StatTile title="x" total={0} tone="neg" rows={[]} />)).toContain('stat-tile-dot-neg')
  })
  it('SegmentedControl still renders 3 bars with dimming', () => {
    const html = renderToString(
      <SegmentedControl options={[{ value: 'a', label: 'A', bars: 2 }]} value="a" onChange={() => {}} />,
    )
    expect(html.match(/tier-bar /g)).toHaveLength(3)
    expect(html.match(/tier-bar bar-3 dim/g)).toHaveLength(1)
    expect(html).not.toContain('tier-bars-sm')
  })
})
