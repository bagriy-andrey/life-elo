import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { buildDetail, type GarminDetailRaw } from '../garmin/detail'
import { I18nProvider } from '../i18n'
import { GarminDayPage } from './GarminDayPage'
import summaries from '../garmin/fixtures/detail-summaries.json'
import sleep from '../garmin/fixtures/detail-sleep.json'
import hr from '../garmin/fixtures/detail-hr.json'
import hrv from '../garmin/fixtures/detail-hrv.json'
import spo2 from '../garmin/fixtures/detail-spo2.json'
import bodyBattery from '../garmin/fixtures/detail-bodybattery.json'
import activities from '../garmin/fixtures/detail-activities.json'

// @ts-ignore node builtin, no @types/node in this project
import { readFileSync } from 'node:fs'
const css: string = readFileSync(new URL('./GarminDayPage.css', import.meta.url), 'utf8')
const DAY = '2026-11-12'
const detail = buildDetail({ summaries, sleep, heartRate: hr, hrv, spo2, bodyBattery, activities } as GarminDetailRaw, DAY)

const render = (data: Parameters<typeof GarminDayPage>[0]['data']) =>
  renderToString(
    <I18nProvider>
      <GarminDayPage day={DAY} onBack={() => {}} data={data} />
    </I18nProvider>,
  )

describe('GarminDayPage smoke render', () => {
  it('renders every section, charts and the collapsed all-fields list', () => {
    const html = render({ detail })
    expect(html).toContain('Garmin · ')
    expect(html).toContain('Назад')
    for (const s of ['Активность', 'Пульс', 'HRV', 'Стресс', 'Body Battery', 'Сон', 'Дыхание и SpO2', 'Тренировки']) {
      expect(html).toContain(`>${s}</h2>`)
    }
    expect(html).toContain('<svg')
    expect(html).toContain('stacked-bar')
    expect(html).toContain('Фазы сна')
    expect(html).toContain('Время в пульсовых зонах')
    expect(html).toContain('<details')
    expect(html).not.toContain('<details open')
    expect(html).toContain('<dt>summary<!-- -->.<wbr/>')
    expect(html).toMatch(/\d+ точек/)
    expect(html).not.toContain('Подробных данных нет')
  })

  it('summary-only shows the row and the sync hint', () => {
    const html = render({ detail: undefined, row: { steps: 9876, activities: [{ type: 'rowing', minutes: 30 }] } })
    expect(html).toContain('Подробных данных нет')
    expect(html).toContain('Шаги')
    expect(html).toContain('Rowing')
    expect(html).not.toContain('<details')
  })

  it('empty day renders only the header and hint', () => {
    const html = render({})
    expect(html).toContain('Назад')
    expect(html).toContain('Подробных данных нет')
    expect(html).not.toContain('<h2')
  })

  it('long all-fields key gets <wbr> and the tree css never breaks letter by letter', () => {
    const longKey = 'averageLongNestedKeyNameThatKeepsGoingOnAndOnForeverAndEver'
    expect(longKey.length).toBeGreaterThanOrEqual(55)
    const html = render({ detail: { ...detail, extra: { [longKey]: { value: 1 } } } as unknown as typeof detail })
    expect(html).toContain(`<dt>extra<!-- -->.<wbr/>${longKey}<!-- -->.<wbr/>value</dt>`)
    const rule = (sel: string) => css.split('\n').filter((l: string) => l.startsWith(sel)).join('\n')
    for (const sel of ['.garmin-page-tree-row dt', '.garmin-page-tree-row dd']) {
      expect(rule(sel)).toContain('overflow-wrap: break-word')
      expect(rule(sel)).not.toMatch(/break-all|anywhere/)
    }
    expect(css).not.toContain('text-transform: capitalize')
  })
})
