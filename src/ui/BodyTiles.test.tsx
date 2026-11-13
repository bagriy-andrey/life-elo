import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { GarminDay } from '../domain/types'
import { garminDayDigest } from '../garmin/dayDigest'
import { I18nProvider } from '../i18n'
import { BodyTilesView, type BodyState } from './BodyTiles'

const TODAY = '2026-11-13'
const noop = () => {}
const row = (p: Partial<GarminDay> = {}): GarminDay => ({ steps: 40, activities: [], ...p }) as GarminDay
const detail = {
  sleep: {
    sleepTimeSeconds: 29760,
    sleepStartTimestampLocal: Date.UTC(2026, 10, 13, 0, 30),
    sleepEndTimestampLocal: Date.UTC(2026, 10, 13, 8, 48),
    sleepScores: { overall: { value: 93, qualifierKey: 'EXCELLENT' } },
  },
  summary: {
    movement: { steps: { value: 40, goal: 11400 } },
    bodyBattery: { latestValue: 98 },
    heartRate: { restingValue: 46 },
    stress: { avgLevel: 14, restDurationInMillis: 96000, lowStressDurationInMillis: 4000 },
  },
  hrv: { hrvSummary: { lastNightAvg: 55, baseline: { balancedLow: 56, balancedUpper: 64 } } },
} as never

const render = (state: BodyState, r?: GarminDay, det?: never, syncAt?: string | null, now?: Date) =>
  renderToString(
    <I18nProvider>
      <BodyTilesView
        state={state}
        today={TODAY}
        digest={state === 'ready' ? garminDayDigest(TODAY, TODAY, r, det) : undefined}
        syncAt={syncAt}
        now={now ?? new Date()}
        onOpen={noop}
        onConnect={noop}
      />
    </I18nProvider>,
  )

describe('BodyTilesView', () => {
  it('connected full day: four tile links with anchors and content', () => {
    const html = render('ready', row({ sleepStart: '00:30', sleepEnd: '08:48', activities: [{ type: 'strength_training', minutes: 69 }] }), detail, '2026-11-13T10:57:00Z', new Date('2026-11-13T11:00:00Z'))
    for (const s of ['sleep', 'activity', 'recovery', 'stress']) expect(html).toContain(`href="/garmin/${TODAY}#${s}"`)
    expect((html.match(/<a /g) ?? []).length).toBe(4)
    expect(html).toContain('Тело')
    expect(html).toContain('Garmin ·')
    expect(html).toContain('00:30 → 08:48')
    expect(html).toContain('Отлично')
    expect(html).toContain('из 11')
    expect(html).toContain('день идёт')
    expect(html).toContain('role="progressbar"')
    expect(html).toContain('/ 100')
    expect(html).toContain('ниже нормы')
    expect(html).toContain('96% времени в покое')
    expect(html).toContain('Strength training')
    expect(html).toContain('aria-hidden="true"')
  })
  it('partial today without sleep: sleep tile shows a dash', () => {
    const html = render('ready', row(), undefined, null)
    expect(html).toContain('—')
    expect(html).toContain('Тренировок пока нет')
    expect(html).not.toContain('→')
    expect((html.match(/<a /g) ?? []).length).toBe(4)
  })
  it('empty day keeps the layout', () => {
    const html = render('ready', undefined, undefined, null)
    expect((html.match(/<a /g) ?? []).length).toBe(4)
    expect(html).not.toContain('role="progressbar"')
  })
  it('no sync time: no caption; stale sync reads «вчера в»', () => {
    expect(render('ready', row(), undefined, null)).not.toContain('Garmin ·')
    expect(render('ready', row(), undefined, '2026-11-11T10:00:00Z', new Date('2026-11-13T11:00:00Z'))).toContain('вчера в')
  })
  it('not connected: one banner to Profile instead of tiles', () => {
    const html = render('notConnected')
    expect(html).toContain('Подключите Garmin')
    expect(html).not.toContain('<a ')
    expect(html).not.toContain('mtile')
  })
  it('loading: skeleton tiles with a hidden label', () => {
    const html = render('loading')
    expect(html).toContain('Загрузка…')
    expect(html).toContain('aria-busy="true"')
  })
})
