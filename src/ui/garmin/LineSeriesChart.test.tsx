import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LineSeriesChart } from './LineSeriesChart'

const hhmm = (t: number) => {
  const d = new Date(t)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}
const T0 = Date.UTC(2026, 9, 1, 0, 0)
const pts = (vs: number[]) => vs.map((v, i) => ({ t: T0 + i * 3_600_000, v }))
const render = (p: ReturnType<typeof pts>, band?: { low: number; high: number }) =>
  renderToString(<LineSeriesChart points={p} band={band} formatTick={hhmm} label="HR summary" />)

describe('LineSeriesChart', () => {
  it('renders empty without a path', () => {
    expect(render([])).not.toContain('<path')
    expect(render(pts([60]))).not.toContain('<path')
  })
  it('renders line, ticks, min/max labels and aria label', () => {
    const html = render(pts([50, 60, 70, 80]))
    expect(html).toContain('line-series__line')
    expect(html).toContain('00:00')
    expect(html).toContain('03:00')
    expect(html).toContain('>50<')
    expect(html).toContain('>80<')
    expect(html).toContain('aria-label="HR summary"')
    expect(html).not.toContain('line-series__band')
  })
  it('renders the band and widens the range', () => {
    const html = render(pts([50, 60]), { low: 40, high: 90 })
    expect(html).toContain('line-series__band')
    expect(html).toContain('>90<')
    expect(html).toContain('>40<')
  })
  it('breaks the line on negative values and ignores them in the range', () => {
    const html = render(pts([50, 60, -1, 70, 80]))
    const d = /class="line-series__line" d="([^"]+)"/.exec(html)![1]
    expect(d.match(/M/g)).toHaveLength(2)
    expect(html).not.toContain('>-1<')
  })
})

describe('LineSeriesChart axis labels', () => {
  it('keeps every label inside the viewBox for wide values and drops units', () => {
    const html = renderToString(
      <LineSeriesChart
        points={pts([9999, 12000, 10500, 9999])}
        formatTick={hhmm}
        formatValue={(v) => `${v} уд/мин`}
        label="HR"
      />,
    )
    const vb = /viewBox="0 0 (\d+) (\d+)"/.exec(html)!
    const W = Number(vb[1])
    const texts = [...html.matchAll(/<text[^>]*? x="([\d.]+)"[^>]*?text-anchor="(\w+)"[^>]*>([^<]*)<\/text>/g)]
    expect(texts.length).toBeGreaterThanOrEqual(4)
    for (const [, x, anchor, txt] of texts) {
      const w = txt.length * 6
      const left = anchor === 'start' ? Number(x) : anchor === 'end' ? Number(x) - w : Number(x) - w / 2
      expect(left).toBeGreaterThanOrEqual(0)
      expect(left + w).toBeLessThanOrEqual(W)
      expect(txt).not.toContain('уд/мин')
    }
    expect(html).toContain('>12000<')
  })
})
