import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MiniBars } from './MiniBars'

describe('MiniBars', () => {
  it('renders empty without bars', () => {
    expect(renderToString(<MiniBars bars={[]} label="SpO2" />)).not.toContain('<rect')
  })
  it('renders bars and labels', () => {
    const html = renderToString(
      <MiniBars bars={[{ label: '00', v: 95 }, { label: '01', v: 97 }, { label: '02', v: -1 }]} formatValue={(v) => `${v}%`} label="SpO2" />,
    )
    expect(html.match(/mini-bars__bar/g)).toHaveLength(2)
    expect(html).toContain('97%')
    expect(html).toContain('>00<')
    expect(html).toContain('aria-label="SpO2"')
  })
})

describe('MiniBars label bounds', () => {
  it('keeps all labels inside the viewBox', () => {
    const bars = Array.from({ length: 24 }, (_, i) => ({ label: `${i}:00`, v: 9999 - i }))
    const html = renderToString(<MiniBars bars={bars} formatValue={(v) => `${v} шагов`} label="Steps" />)
    const W = Number(/viewBox="0 0 (\d+) /.exec(html)![1])
    const texts = [...html.matchAll(/<text[^>]*? x="([\d.]+)"[^>]*>([^<]*)<\/text>/g)]
    expect(texts.length).toBeGreaterThan(1)
    for (const m of texts) {
      const x = Number(m[1]), w = m[2].length * 5.5
      const centered = m[0].includes('middle')
      const left = centered ? x - w / 2 : x
      expect(left).toBeGreaterThanOrEqual(0)
      expect(left + w).toBeLessThanOrEqual(W)
    }
  })
})
