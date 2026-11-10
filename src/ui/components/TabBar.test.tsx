import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { tabIcons } from '../tabIcons'
import { TabBar } from './TabBar'

describe('TabBar', () => {
  it('renders the icon (hidden from screen readers) next to the label', () => {
    const html = renderToString(
      <TabBar active="home" onSelect={() => {}} items={[{ id: 'home', label: 'Главная', icon: tabIcons.home, badge: true }]} />,
    )
    expect(html).toContain('class="on has-icon"')
    expect(html).toContain('<span class="tab-icon" aria-hidden="true"><svg')
    expect(html).toContain('<span class="tab-label">Главная</span>')
    expect(html).toContain('class="dot"')
  })
  it('keeps text-only tabs without an icon', () => {
    const html = renderToString(<TabBar active="a" onSelect={() => {}} items={[{ id: 'b', label: 'Б' }]} />)
    expect(html).not.toContain('tab-icon')
    expect(html).not.toContain('has-icon')
  })
})
