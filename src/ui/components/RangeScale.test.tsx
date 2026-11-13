import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RangeScale } from './RangeScale'
import { corridorLabelX, corridorRect, scaleX, SCALE_WIDTH, textWidth, TRACK_PAD } from './rangeScaleMath'

const base = { min: 34, max: 82, tone: 'neg' as const, lowLabel: '34', highLabel: '82' }

describe('RangeScale', () => {
  it('clamps values and corridor to the scale', () => {
    expect(scaleX(10, 34, 82)).toBe(TRACK_PAD)
    expect(scaleX(200, 34, 82)).toBe(SCALE_WIDTH - TRACK_PAD)
    expect(scaleX(34, 5, 5)).toBe(0)
    expect(corridorRect(20, 100, 34, 82)).toEqual({ x: TRACK_PAD, width: SCALE_WIDTH - 2 * TRACK_PAD })
    expect(corridorRect(90, 100, 34, 82)).toBeNull()
    const html = renderToString(<RangeScale {...base} value={999} />)
    expect(html).toContain(`cx="${SCALE_WIDTH - TRACK_PAD}"`)
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
  it('keeps the dot and its ring inside the viewBox at the extremes', () => {
    for (const x of [scaleX(-1e9, 34, 82), scaleX(1e9, 34, 82)]) {
      expect(x - 8.5).toBeGreaterThanOrEqual(0)
      expect(x + 8.5).toBeLessThanOrEqual(SCALE_WIDTH)
    }
  })
  it('keeps the corridor label clear of the end labels and inside the viewBox', () => {
    const label = 'норма 56–64'
    const w = textWidth(label)
    const atMin = corridorLabelX({ x: 10, width: 30 }, label, '34', '82')!
    expect(atMin).toBeGreaterThanOrEqual(textWidth('34'))
    const atMax = corridorLabelX({ x: 280, width: 36 }, label, '34', '82')!
    expect(atMax + w).toBeLessThanOrEqual(SCALE_WIDTH - textWidth('82'))
    const long = 'x'.repeat(80)
    expect(corridorLabelX({ x: 100, width: 50 }, long, '34', '82')).toBeNull()
    const html = renderToString(<RangeScale {...base} value={55} corridor={{ low: 56, high: 64 }} corridorLabel={long} />)
    expect(html).not.toContain(long)
  })
})
