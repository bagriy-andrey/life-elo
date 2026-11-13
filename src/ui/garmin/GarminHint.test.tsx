import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { I18nProvider } from '../../i18n'
import { GarminHint } from './GarminHint'

const render = (n: number) =>
  renderToString(
    <I18nProvider>
      <GarminHint evidence={{ kind: 'steps', value: n }} />
    </I18nProvider>,
  )

describe('GarminHint', () => {
  it('uses ru plurals for steps', () => {
    expect(render(1)).toContain('<b>1</b> шаг<')
    expect(render(2)).toContain('<b>2</b> шага<')
    expect(render(5)).toContain('<b>5</b> шагов<')
    expect(render(21)).toContain('<b>21</b> шаг<')
  })
  it('renders wake and activity evidence', () => {
    const html = renderToString(
      <I18nProvider>
        <GarminHint evidence={{ kind: 'wake', value: '06:30' }} />
        <GarminHint evidence={{ kind: 'activity', type: 'mystery_sport', minutes: 40 }} />
      </I18nProvider>,
    )
    expect(html).toContain('проснулся в <b>06:30</b>')
    expect(html).toContain('<b>mystery sport · 40 мин</b>')
  })
})
