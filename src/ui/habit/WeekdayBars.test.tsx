import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { I18nProvider } from '../../i18n'
import { WeekdayBars } from './WeekdayBars'

const render = (p: (number | null)[]) =>
  renderToString(
    <I18nProvider>
      <WeekdayBars percents={p} />
    </I18nProvider>,
  )

describe('WeekdayBars', () => {
  it('renders 7 bars, best highlighted', () => {
    const html = render([50, 80, 70, 20, null, 0, 65])
    expect(html.match(/weekday-bars__col/g)).toHaveLength(7)
    expect(html.match(/weekday-bars__bar--best/g)).toHaveLength(1)
    expect(html).toContain('80%')
    expect(html).toContain('—')
    expect(html).toContain('По дням недели')
  })
  it('no best when all zero or null', () => {
    const html = render([0, null, null, null, null, null, null])
    expect(html).not.toContain('weekday-bars__bar--best')
  })
})
