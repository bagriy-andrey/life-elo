import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ReplayResult, LedgerEntry } from '../engine/rating'
import { I18nProvider } from '../i18n'
import { Home } from './Home'

const mk = (n: number): ReplayResult => {
  let r = 0
  const ledger = Array.from({ length: n }, (_, i) => {
    const delta = i % 3 === 2 ? -1 : 2
    const e = {
      day: `2026-01-${String(i + 1).padStart(2, '0')}`, rulesetVersion: 'v1', reviewRevision: 1, status: 'reviewed',
      ratingBefore: r, delta, ratingAfter: r + delta, dayScore: 0, expected: 0, clamped: false, contributions: [],
    } as unknown as LedgerEntry
    r += delta
    return e
  })
  return { ledger, rating: r, cleanDayStreak: 0 } as unknown as ReplayResult
}

const render = (n: number, pendingDay?: string) =>
  renderToString(
    <I18nProvider>
      <Home result={mk(n)} habits={[]} pendingDay={pendingDay} onReview={() => {}} />
    </I18nProvider>,
  )

describe('Home smoke render', () => {
  it('empty ledger: start caption, no chart', () => {
    const html = render(0)
    expect(html).toContain('Старт с нуля')
    expect(html).not.toContain('Динамика')
    expect(html).not.toContain('Разбор дня')
  })
  it('more than 10 days: period toggle and day review', () => {
    const html = render(15)
    expect(html).toContain('role="tablist"')
    expect(html).toContain('Разбор дня')
    expect(html).toMatch(/<details[^>]* open/)
  })
  it('10 days or fewer: no toggle', () => {
    expect(render(5)).not.toContain('role="tablist"')
  })
  it('pending day shows the banner', () => {
    expect(render(3, '2026-01-04')).toContain('Как прошёл вчерашний день?')
    expect(render(3)).not.toContain('Как прошёл вчерашний день?')
  })
})
