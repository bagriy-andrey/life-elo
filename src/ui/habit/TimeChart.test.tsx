import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { TimePoint, TimeSeries } from '../../domain/habitCharts'
import type { DayKey } from '../../domain/types'
import { I18nProvider } from '../../i18n'
import { TimeChart } from './TimeChart'

const points: TimePoint[] = Array.from({ length: 30 }, (_, i) => {
  const day = `2026-10-${String(i + 1).padStart(2, '0')}` as DayKey
  if (i % 5 === 0) return { day, minutes: null, zone: 'nodata' }
  const zone = i % 3 === 0 ? 'onTime' : i % 3 === 1 ? 'tolerable' : 'late'
  return { day, minutes: 1380 + (i % 3) * 20, zone }
})
const series: TimeSeries = {
  points,
  bounds: { target: 1380, tolerable: 1410 },
  share: { onTime: 40, tolerable: 35, late: 25 },
  avg4w: 1395,
  avgPrev4w: 1405,
  diffMinutes: -10,
}
const render = (s: TimeSeries) =>
  renderToString(
    <I18nProvider>
      <TimeChart series={s} />
    </I18nProvider>,
  )

describe('TimeChart', () => {
  it('renders zones, labels, legend and delta', () => {
    const html = render(series)
    expect(html).toContain('time-chart__zone--onTime')
    expect(html).toContain('time-chart__zone--tolerable')
    expect(html).toContain('time-chart__zone--late')
    expect(html).toContain('23:00')
    expect(html).toContain('23:30')
    expect(html).toContain('40%')
    expect(html).toContain('35%')
    expect(html).toContain('25%')
    expect(html).toContain('на 10 мин раньше')
    expect(html).toContain('Сегодня')
  })
  it('renders without data', () => {
    const empty = points.map((p): TimePoint => ({ ...p, minutes: null, zone: 'nodata' }))
    const html = render({
      ...series,
      points: empty,
      share: { onTime: 0, tolerable: 0, late: 0 },
      avg4w: null,
      avgPrev4w: null,
      diffMinutes: null,
    })
    expect(html).toContain('—')
    expect(html).not.toContain('time-chart__line')
  })
})
