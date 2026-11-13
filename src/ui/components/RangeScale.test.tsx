import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RangeScale } from './RangeScale'
import { corridorRect, scaleX, SCALE_WIDTH } from './rangeScaleMath'

const base = { min: 34, max: 82, tone: 'neg' as const, lowLabel: '34', highLabel: '82' }

describe('RangeScale', () => {
  it('clamps values and corridor to the scale', () => {
    expect(scaleX(10, 34, 82)).toBe(0)
    expect(scaleX(200, 34, 82)).toBe(SCALE_WIDTH)
    expect(scaleX(34, 5, 5)).toBe(0)
    expect(corridorRect(20, 100, 34, 82)).toEqual({ x: 0, width: SCALE_WIDTH })
    expect(corridorRect(90, 100, 34, 82)).toBeNull()
    const html = renderToString(<RangeScale {...base} value={999} />)
    expect(html).toContain(`cx="${SCALE_WIDTH}"`)
  })
  it('without a corridor renders bar + dot only', () => {
    const html = renderToString(<RangeScale {...base} value={55} corridorLabel="норма 56–64" />)
    expect(html).not.toContain('rscale-corridor')
    expect(html).not.toContain('норма')
    expect(html).toContain('rscale-dot')
  })
  it('with a corridor shows it and its label; svg is aria-hidden', () => {
    const html = renderToString(<RangeScale {...base} value={55} corridor={{ low: 56, high: 64 }} corridorLabel="норма 56–64" />)
    expect(html).toContain('rscale-corridor')
    expect(html).toContain('норма 56–64')
    expect(html).toContain('aria-hidden="true"')
  })
})
