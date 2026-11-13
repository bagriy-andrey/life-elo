import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { I18nProvider } from '../i18n'
import { GarminDataSheet } from './GarminDataSheet'

const render = (rows: Parameters<typeof GarminDataSheet>[0]['rows'], lastPullAt: string | null = '2026-11-13T08:00:00Z') =>
  renderToString(
    <I18nProvider>
      <GarminDataSheet open onClose={() => {}} lastPullAt={lastPullAt} rows={rows} />
    </I18nProvider>,
  )

describe('GarminDataSheet smoke render', () => {
  it('lists days newest first with values and dashes', () => {
    const html = render([
      { day: '2026-11-11', activities: [] },
      {
        day: '2026-11-12',
        steps: 9876,
        sleepStart: '23:40',
        sleepEnd: '07:10',
        activities: [
          { type: 'paddelball', minutes: 126 },
          { type: 'rowing', minutes: 30 },
        ],
      },
    ])
    expect(html).toContain('Данные Garmin')
    expect(html).toContain('Последняя синхронизация')
    expect(html).toContain('Сон (ночь на')
    expect(html).toContain('23:40 → 07:10')
    expect(html).toContain('Падел · 126 мин')
    expect(html).toContain('Rowing · 30 мин')
    expect(html).toContain('—')
    expect(html).toContain('<button type="button" class="garmin-day"')
    expect(html.indexOf('12')).toBeLessThan(html.lastIndexOf('11'))
  })

  it('shows the empty state', () => {
    const html = render([], null)
    expect(html).toContain('Данных Garmin пока нет')
    expect(html).toContain('Синхронизации ещё не было')
  })
})
