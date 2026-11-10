import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Menu } from './index'
import { placeMenu } from './Menu'

describe('Menu', () => {
  it('renders a closed ⋮ trigger with aria and no popover', () => {
    const html = renderToString(<Menu items={[{ id: 'a', label: 'Item A' }]} onSelect={() => {}} triggerLabel="Actions" />)
    expect(html).toContain('aria-label="Actions"')
    expect(html).toContain('aria-haspopup="menu"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain('role="menu"')
    expect(html).not.toContain('Item A')
  })
  it('placeMenu opens below when it fits, above when cramped and roomier above', () => {
    expect(placeMenu({ top: 100, bottom: 144 }, 200, 800)).toBe('below')
    expect(placeMenu({ top: 700, bottom: 744 }, 200, 800)).toBe('above')
    expect(placeMenu({ top: 10, bottom: 54 }, 300, 320)).toBe('below')
  })
})
