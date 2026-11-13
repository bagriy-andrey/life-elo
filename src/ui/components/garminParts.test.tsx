import { readFileSync } from 'node:fs'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FactGrid, ProgressBar } from './index'

describe('ProgressBar', () => {
  it('renders a progressbar with clamped value and tone', () => {
    const html = renderToString(<ProgressBar value={5700} max={11400} label="Шаги" tone="pos" size="sm" />)
    expect(html).toContain('role="progressbar"')
    expect(html).toContain('aria-valuenow="5700"')
    expect(html).toContain('aria-valuemax="11400"')
    expect(html).toContain('width:50%')
    expect(html).toContain('meter-pos')
    expect(html).toContain('meter-sm')
  })
  it('CSS heights: sm 6px, md 8px', () => {
    const css = readFileSync(new URL('./ProgressBar.css', import.meta.url), 'utf8')
    expect(css).toMatch(/\.meter-sm\s*\{\s*height:\s*var\(--space-6\)/)
    expect(css).toMatch(/\.meter-md\s*\{\s*height:\s*var\(--space-8\)/)
  })
  it('clamps over/under and a zero max', () => {
    expect(renderToString(<ProgressBar value={20} max={10} label="x" />)).toContain('width:100%')
    expect(renderToString(<ProgressBar value={-3} max={10} label="x" />)).toContain('width:0%')
    expect(renderToString(<ProgressBar value={1} max={0} label="x" />)).toContain('aria-valuemax="1"')
  })
})

describe('FactGrid', () => {
  it('renders label, value and optional hint per item', () => {
    const html = renderToString(
      <FactGrid items={[{ label: 'Пульс покоя', value: '46', hint: 'за 7 дней 48' }, { label: 'Этажи', value: '12' }]} />,
    )
    expect(html).toContain('Пульс покоя')
    expect(html).toContain('>46<')
    expect(html).toContain('за 7 дней 48')
    expect(html.match(/class="fact"/g)).toHaveLength(2)
    expect(html.match(/fact-hint/g)).toHaveLength(1)
  })
})
