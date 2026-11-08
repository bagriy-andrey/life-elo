import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ProgressSegments } from './ProgressSegments'
import { QuotaDots } from './QuotaDots'

describe('ProgressSegments', () => {
  it('marks done / current / pending segments and shows the counter', () => {
    const html = renderToString(<ProgressSegments total={4} current={1} counterLabel="2 из 4" />)
    expect(html).toContain('2 из 4')
    expect(html.match(/progress-done/g)).toHaveLength(1)
    expect(html.match(/progress-current/g)).toHaveLength(1)
    expect(html.match(/progress-pending/g)).toHaveLength(2)
  })
})

describe('QuotaDots', () => {
  it('uses warn tone while the limit is not exhausted', () => {
    const html = renderToString(<QuotaDots used={1} limit={3} note="Использовано 1 из 3" />)
    expect(html).toContain('quota-warn')
    expect(html).not.toContain('quota-neg')
    expect(html.match(/quota-dot-used/g)).toHaveLength(1)
    expect(html.match(/class="quota-dot[ "]/g)).toHaveLength(3)
    expect(html).toContain('Использовано 1 из 3')
  })
  it('uses neg tone when exhausted', () => {
    const html = renderToString(<QuotaDots used={2} limit={2} note="x" />)
    expect(html).toContain('quota-neg')
    expect(html).not.toContain('quota-warn')
  })
})
