import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BottomSheet } from './BottomSheet'

describe('BottomSheet', () => {
  it('renders nothing when closed', () => {
    expect(renderToString(<BottomSheet open={false} title="Новая" closeLabel="Закрыть" onClose={() => {}}>x</BottomSheet>)).toBe('')
  })
  it('renders a labelled modal dialog with close button, body and footer', () => {
    const html = renderToString(
      <BottomSheet open title="Новая привычка" closeLabel="Закрыть" onClose={() => {}} footer={<button>Сохранить</button>}>
        <p>тело</p>
      </BottomSheet>,
    )
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('aria-labelledby=')
    expect(html).toContain('Новая привычка')
    expect(html).toContain('aria-label="Закрыть"')
    expect(html).toContain('тело')
    expect(html).toContain('bottom-sheet-footer')
    expect(html).toContain('Сохранить')
  })
  it('omits the footer when not given', () => {
    const html = renderToString(<BottomSheet open title="t" closeLabel="c" onClose={() => {}}>x</BottomSheet>)
    expect(html).not.toContain('bottom-sheet-footer')
  })
  it('renders pick-list option rows', () => {
    const html = renderToString(
      <BottomSheet open title="Язык" closeLabel="Закрыть" onClose={() => {}}>
        <div className="sheet-options">
          <button className="sheet-option" aria-pressed="true">Русский</button>
        </div>
      </BottomSheet>,
    )
    expect(html).toContain('Язык')
    expect(html).toContain('Русский')
    expect(html).toContain('aria-pressed="true"')
  })
})
