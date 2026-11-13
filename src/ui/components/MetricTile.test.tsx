// @ts-ignore node builtin, no @types/node in this project
import { readFileSync } from 'node:fs'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MetricTile } from './MetricTile'

const icon = <svg viewBox="0 0 24 24" />

describe('MetricTile', () => {
  it('renders an <a> when href is set', () => {
    const html = renderToString(<MetricTile href="/garmin/2026-11-13#sleep" icon={icon} title="Сон" value="8" unit="ч" sub="00:30 → 08:48" footer="93" />)
    expect(html.startsWith('<a ')).toBe(true)
    expect(html).toContain('href="/garmin/2026-11-13#sleep"')
    expect(html).toContain('Сон')
    expect(html).toContain('00:30 → 08:48')
    expect(html).toContain('mtile-footer')
  })
  it('renders a type=button <button> without href', () => {
    const html = renderToString(<MetricTile onClick={() => {}} icon={icon} title="Шаги" value="40" />)
    expect(html.startsWith('<button ')).toBe(true)
    expect(html).toContain('type="button"')
  })
  it('keeps layout with an empty «—» value and no sub/footer', () => {
    const html = renderToString(<MetricTile href="#" icon={icon} title="Сон" value="—" />)
    expect(html).toContain('mtile-value')
    expect(html).toContain('—')
    expect(html).not.toContain('mtile-sub')
    expect(html).not.toContain('mtile-footer')
  })
  it('shows skeletons while loading', () => {
    const html = renderToString(<MetricTile href="#" icon={icon} title="Сон" value="8" loading />)
    expect(html).toContain('skeleton')
    expect(html).not.toContain('mtile-value')
  })
  it('css: shrinkable, wraps long values, min height, focus ring, inherits colour', () => {
    const css = readFileSync('src/ui/components/MetricTile.css', 'utf8')
    expect(css).toContain('min-width: 0')
    expect(css).toContain('overflow-wrap: anywhere')
    expect(css).toContain('min-height: 150px')
    expect(css).toContain(':focus-visible')
    expect(css).toContain('color: inherit')
  })
})
