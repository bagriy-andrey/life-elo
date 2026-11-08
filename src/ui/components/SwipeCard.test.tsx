import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SwipeCard } from './SwipeCard'

const base = {
  typeLabel: 'Привычка', title: 'Зарядка', question: 'Сделали вчера?',
  goodLabel: 'Сделал', badLabel: 'Не сделал', hint: 'Свайп вправо — сделал', onAnswer: () => {},
}

describe('SwipeCard', () => {
  it('renders texts, both answer buttons and optional peek / not-applicable', () => {
    const html = renderToString(<SwipeCard {...base} peek notApplicableLabel="Не применимо" />)
    expect(html).toContain('Зарядка')
    expect(html).toContain('aria-keyshortcuts="ArrowLeft"')
    expect(html).toContain('aria-keyshortcuts="ArrowRight"')
    expect(html).toContain('swipe-peek')
    expect(html).toContain('Не применимо')
  })
  it('omits peek and not-applicable by default', () => {
    const html = renderToString(<SwipeCard {...base} />)
    expect(html).not.toContain('swipe-peek')
    expect(html).not.toContain('swipe-na')
  })
})
