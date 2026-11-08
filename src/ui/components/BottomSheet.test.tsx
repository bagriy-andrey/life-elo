import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BottomSheet } from './BottomSheet'

describe('BottomSheet', () => {
  it('renders nothing when closed', () => {
    const html = renderToString(
      <BottomSheet open={false} title="Язык" onClose={() => {}}>
        <p>тело</p>
      </BottomSheet>,
    )
    expect(html).toBe('')
  })

  it('renders a labelled modal dialog when open', () => {
    const html = renderToString(
      <BottomSheet open title="Язык" onClose={() => {}}>
        <button className="sheet-option" aria-pressed="true">Русский</button>
      </BottomSheet>,
    )
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('aria-labelledby')
    expect(html).toContain('Язык')
    expect(html).toContain('Русский')
  })
})
