import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LegendRow, SegmentBar, segmentShares } from './SegmentBar'

const segs = [
  { key: 'deep', label: 'Глубокий', value: 85, color: 'tier-weak' as const },
  { key: 'light', label: 'Лёгкий', value: 262, color: 'tier-medium' as const },
  { key: 'rem', label: 'REM', value: 150, color: 'tier-strong' as const },
  { key: 'awake', label: 'Бодрствование', value: 0, color: 'muted' as const },
]

describe('SegmentBar', () => {
  it('widths sum to at most 100 %', () => {
    const sum = segmentShares(segs).reduce((a, b) => a + b, 0)
    expect(sum).toBeLessThanOrEqual(100.0001)
    expect(segmentShares([{ key: 'a', label: 'a', value: 0, color: 'pos' }])).toEqual([0])
  })
  it('omits zero segments, is aria-hidden and uses token colours', () => {
    const html = renderToString(<SegmentBar segments={segs} />)
    expect(html).toContain('aria-hidden="true"')
    expect(html.match(/segbar-part/g)).toHaveLength(3)
    expect(html).toContain('var(--tier-weak)')
    expect(html).not.toContain('var(--muted)')
  })
})

describe('LegendRow', () => {
  it('carries name, value and percent as text', () => {
    const html = renderToString(<LegendRow color="warn" name="Средний стресс" value="2 мин" percent="0%" />)
    expect(html).toContain('Средний стресс')
    expect(html).toContain('2 мин')
    expect(html).toContain('0%')
    expect(html).toContain('var(--warn)')
  })
})
