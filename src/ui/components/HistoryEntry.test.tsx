import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { I18nProvider } from '../../i18n'
import type { LedgerEntry } from '../../engine/rating'
import { HistoryEntry } from './HistoryEntry'

const entry = {
  day: '2026-01-01', rulesetVersion: 'v1', reviewRevision: 1, status: 'reviewed',
  ratingBefore: 0, delta: 0, ratingAfter: 0, dayScore: 0, expected: 0, clamped: false, contributions: [],
} as unknown as LedgerEntry
const render = (open?: boolean) =>
  renderToString(
    <I18nProvider>
      <HistoryEntry entry={entry} habits={new Map()} defaultOpen={open} />
    </I18nProvider>,
  )

describe('HistoryEntry', () => {
  it('is closed by default', () => expect(render()).not.toMatch(/<details[^>]* open/))
  it('is open with defaultOpen', () => expect(render(true)).toMatch(/<details[^>]* open/))
})
