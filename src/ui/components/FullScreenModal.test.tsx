import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FullScreenModal } from './FullScreenModal'
import { nextFocusTarget } from './focus'

describe('FullScreenModal', () => {
  it('renders a modal dialog with label and no close button', () => {
    const html = renderToString(
      <FullScreenModal label="Вчера">
        <p>тело</p>
      </FullScreenModal>,
    )
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-label="Вчера"')
    expect(html).toContain('тело')
    expect(html).not.toContain('<button')
  })
})

describe('nextFocusTarget', () => {
  const box = 'box'
  const items = ['a', 'b', 'c']
  it('wraps forward from the last item', () => expect(nextFocusTarget(items, 'c', box, false)).toBe('a'))
  it('wraps backward from the first item or the container', () => {
    expect(nextFocusTarget(items, 'a', box, true)).toBe('c')
    expect(nextFocusTarget(items, box, box, true)).toBe('c')
  })
  it('leaves middle movement to the browser', () => {
    expect(nextFocusTarget(items, 'b', box, false)).toBeNull()
    expect(nextFocusTarget(items, 'b', box, true)).toBeNull()
  })
  it('pulls stray focus back in', () => expect(nextFocusTarget(items, null, box, false)).toBe('a'))
  it('keeps focus on the container when nothing is focusable', () => expect(nextFocusTarget([], null, box, false)).toBe(box))
})
