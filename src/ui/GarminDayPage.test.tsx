import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { buildDetail, type GarminDetailRaw } from '../garmin/detail'
import type { GarminDetail } from '../domain/types'
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
      <GarminDayPage day={DAY} onBack={() => {}} sync={{ at: null }} data={data} />
    </I18nProvider>,
  )

const at = new Date(2026, 10, 12, 13, 57).toISOString()
const renderSync = (sync: NonNullable<Parameters<typeof GarminDayPage>[0]['sync']>, day = DAY, today = '2026-11-13') =>
  renderToString(
    <I18nProvider>
      <GarminDayPage day={day} today={today} onBack={() => {}} sync={sync} data={{ detail }} />
    </I18nProvider>,
  )

describe('GarminDayPage header', () => {
  it('shows the sync time and «день идёт» on today', () => {
    const html = renderSync({ at, now: new Date(2026, 10, 12, 15, 0) }, '2026-11-12', '2026-11-12')
    expect(html).toContain('Garmin · синхронизировано в 13:57 · день идёт')
  })
  it('says «вчера в» when the sync is older than 24 h; no tail for past days', () => {
    const html = renderSync({ at, now: new Date(2026, 10, 13, 15, 0) })
    expect(html).toContain('Garmin · синхронизировано вчера в 13:57')
    expect(html).not.toContain('день идёт')
  })
  it('hides the caption when the sync is unknown', () => {
    expect(renderSync({ at: null })).not.toContain('синхронизировано')
  })
  it('uses «Назад» when opened from the review', () => {
    const html = renderToString(
      <I18nProvider>
        <GarminDayPage day={DAY} backLabel="back" onBack={() => {}} sync={{ at: null }} data={{ detail }} />
      </I18nProvider>,
    )
    expect(html).toContain('‹ Назад')
  })
})

const SECTION_IDS = ['sleep', 'recovery', 'activity', 'stress', 'breath']

describe('GarminDayPage sections', () => {
  it('renders every section with its id, charts and the dev all-fields list', () => {
    const html = render({ detail })
    expect(html).toContain('‹ Главная')
    expect(html).toContain('чт, 12 ноября')
    for (const id of SECTION_IDS) expect(html).toContain(`id="${id}"`)
    for (const s of ['Сон', 'Восстановление', 'Активность', 'Стресс', 'Дыхание и SpO2']) expect(html).toContain(`>${s}</h2>`)
    expect(html).toContain('<svg')
    expect(html).toContain('segbar')
    expect(html).toContain('Фазы сна')
    expect(html).toContain('Глубокий')
    expect(html).toContain('Бодрствование')
    expect(html).toContain('role="progressbar"')
    expect(html).not.toContain('stacked-bar')
    expect(html).not.toContain('Подробных данных нет')
    expect(html).not.toContain('garmin-page-rows')
    // «Все поля» only behind the dev flag (vitest runs with DEV on)
    expect(html).toContain('<details')
    expect(html).not.toContain('<details open')
    expect(html).toContain('<dt>summary<!-- -->.<wbr/>')
  })

  it('summary-only shows steps, workouts, «—» for the rest and the sync hint', () => {
    const html = render({ detail: undefined, row: { steps: 9876, activities: [{ type: 'rowing', minutes: 30 }] } })
    expect(html).toContain('Подробных данных нет')
    expect(html).toContain('9\u00a0876')
    expect(html.replaceAll('<!-- -->', '')).toContain('Rowing · 30 мин')
    expect(html).toContain('—')
    expect(html).not.toContain('<details')
  })

  it('empty day shows one muted empty state and no sections', () => {
    const html = render({})
    expect(html).toContain('Данных Garmin за этот день нет')
    expect(html).not.toContain('<h2')
    expect(html).not.toContain('<details')
  })

  it('partial day: steps, goal, «пока нет» workouts, sections intact', () => {
    const partial = {
      summary: { movement: { steps: { value: 40, goal: 11400 } }, bodyBattery: { latestValue: 98, chargedValue: 62, drainedValue: 4 } },
    } as unknown as GarminDetail
    const html = renderToString(
      <I18nProvider>
        <GarminDayPage day="2026-11-13" today="2026-11-13" onBack={() => {}} sync={{ at, now: new Date(2026, 10, 13, 15, 0) }} data={{ detail: partial, row: { steps: 40, activities: [] } }} />
      </I18nProvider>,
    )
    expect(html).toContain('день идёт')
    expect(html).toContain('цель 11\u00a0400')
    expect(html).toContain('до 13:57')
    expect(html).toContain('+62')
    expect(html).toContain('−4')
    expect(html).toContain('пока нет')
    for (const id of SECTION_IDS) expect(html).toContain(`id="${id}"`)
  })

  it('HRV with a baseline shows the corridor and the word; without it no corridor', () => {
    const withBase = (baseline: unknown) =>
      ({ hrv: { hrvSummary: { lastNightAvg: 55, status: 'UNBALANCED', ...(baseline ? { baseline } : {}) }, hrvReadings: [{ hrvValue: 34 }, { hrvValue: 82 }] } }) as unknown as GarminDetail
    const a = render({ detail: withBase({ balancedLow: 56, balancedUpper: 64 }) })
    expect(a).toContain('норма 56–64')
    expect(a).toContain('ниже нормы')
    expect(a).toContain('rscale-corridor')
    const b = render({ detail: withBase(undefined) })
    expect(b).not.toContain('rscale-corridor')
    expect(b).not.toContain('норма')
    expect(b).toContain('Не в балансе')
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

describe('GarminDayPage week card', () => {
  const keys = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15']
  const full = {
    rows: Object.fromEntries(keys.slice(0, 5).map((k, i) => [k, { steps: 4000 + i * 1000, sleepStart: '23:00', sleepEnd: '07:00', activities: [] }])),
    details: Object.fromEntries(
      keys.slice(0, 5).map((k) => [k, { summary: { movement: { steps: { goal: 11400 } }, intensityMinutes: { goal: 150, moderate: 20, vigorous: 10 } } }]),
    ),
  }
  const renderWeek = (week: Parameters<typeof GarminDayPage>[0]['week'], onSelectDay: ((d: string) => void) | null = () => {}) =>
    renderToString(
      <I18nProvider>
        <GarminDayPage day="2026-11-13" today="2026-11-13" onBack={() => {}} sync={{ at: null }} data={{ detail }} week={week} onSelectDay={onSelectDay ?? undefined} />
      </I18nProvider>,
    )
  it('renders the card under the header with range, captions, 7 buttons and the goal label', () => {
    const html = renderWeek(full)
    expect(html).toContain('>Неделя</h2>')
    expect(html).toContain('9–15 ноября')
    expect(html).toContain('Шаги · пунктир — цель 11')
    expect(html).toContain('11,4к')
    expect((html.match(/class="wchart-day /g) ?? []).length).toBe(7)
    expect((html.match(/<button[^>]*disabled/g) ?? []).length).toBe(2)
    expect(html).toContain('aria-current="date"')
    expect(html).toContain('шагов, сон 8 ч')
    expect(html.indexOf('wchart')).toBeLessThan(html.indexOf('id="sleep"'))
  })
  it('feeds the week intensity (5 x (20 + 2 x 10) = 200) into the activity row', () => {
    expect(renderWeek(full)).toContain('за неделю')
  })
  it('partial week with gaps still renders; no card without onSelectDay or week', () => {
    const html = renderWeek({ rows: { '2026-11-11': { steps: 3000, activities: [] } }, details: {} })
    expect((html.match(/class="wchart-day /g) ?? []).length).toBe(7)
    expect(html).toContain('нет данных')
    expect(renderWeek(full, null)).not.toContain('wchart')
    expect(render({ detail })).not.toContain('wchart')
  })
})
