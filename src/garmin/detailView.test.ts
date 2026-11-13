import { describe, expect, it } from 'vitest'
import { buildDetail, type GarminDetailRaw } from './detail'
import { flattenForTree, watchOffsetMs, formatDistance, formatDuration, garminDayDetailView, type DetailSection } from './detailView'
import { ru } from '../i18n/ru'
import { en } from '../i18n/en'
import { uk } from '../i18n/uk'
import summaries from './fixtures/detail-summaries.json'
import sleep from './fixtures/detail-sleep.json'
import hr from './fixtures/detail-hr.json'
import hrv from './fixtures/detail-hrv.json'
import spo2 from './fixtures/detail-spo2.json'
import bodyBattery from './fixtures/detail-bodybattery.json'
import activities from './fixtures/detail-activities.json'

const DAY = '2026-11-12'
const raw: GarminDetailRaw = { summaries, sleep, heartRate: hr, hrv, spo2, bodyBattery, activities }
const detail = buildDetail(raw, DAY)
const view = garminDayDetailView(detail)
const sec = (id: string): DetailSection => view.sections.find((s) => s.id === id)!
const keys = (s: DetailSection) => s.items.map((i) => i.key.replace('garmin.day.i.', ''))
const item = (s: DetailSection, k: string) => s.items.find((i) => i.key === `garmin.day.i.${k}`)

describe('garminDayDetailView', () => {
  it('has every section in order, not summary-only', () => {
    expect(view.summaryOnly).toBe(false)
    expect(view.sections.map((s) => s.id)).toEqual([
      'activity', 'heartRate', 'hrv', 'stress', 'bodyBattery', 'sleep', 'respiration', 'activities',
    ])
  })

  it('activity: steps, floors, calories, intensity', () => {
    const a = sec('activity')
    expect(item(a, 'steps')).toMatchObject({ value: 11711, unit: 'steps' })
    expect(item(a, 'distance')).toMatchObject({ value: 9760, unit: 'm' })
    expect(keys(a)).toEqual(
      expect.arrayContaining(['stepGoal', 'floorsUp', 'floorsDown', 'caloriesResting', 'caloriesActive', 'caloriesTotal', 'intensityModerate', 'intensityVigorous', 'intensityGoal']),
    )
  })

  it('heart rate: items + day curve line', () => {
    const h = sec('heartRate')
    expect(item(h, 'hrResting')?.value).toBe(49)
    expect(item(h, 'hrRestingWeek')?.value).toBe(47)
    const c = h.charts![0]
    expect(c.kind).toBe('line')
    if (c.kind === 'line') {
      expect(c.points.length).toBeGreaterThan(10)
      expect(c.points[0]).toEqual({ t: 1794438000000, v: 66 })
    }
  })

  it('hrv: status enum, night series with baseline band', () => {
    const h = sec('hrv')
    expect(item(h, 'hrvStatus')).toMatchObject({ value: 'UNBALANCED', valueKey: 'garmin.day.hrvStatus.UNBALANCED' })
    expect(item(h, 'hrvLastNight')?.value).toBe(54)
    const c = h.charts![0]
    if (c.kind !== 'line') throw new Error('line expected')
    expect(c.band).toEqual({ low: 56, high: 64 })
    expect(c.points[0].t).toBe(Date.parse('2026-11-11T22:06:33Z'))
  })

  it('stress: avg/max/qualifier + durations in seconds', () => {
    const s = sec('stress')
    expect(item(s, 'stressAvg')?.value).toBe(25)
    expect(item(s, 'stressQualifier')?.valueKey).toBe('garmin.day.stressQualifier.balanced')
    const c = s.charts![0]
    if (c.kind !== 'stacked') throw new Error('stacked expected')
    expect(c.segments.find((x) => x.key === 'garmin.day.stressLevel.rest')?.value).toBe(48420)
  })

  it('body battery: values + events with impact', () => {
    const b = sec('bodyBattery')
    expect(item(b, 'bbMin')?.value).toBe(24)
    expect(item(b, 'bbCharged')?.value).toBe(66)
    expect(b.groups!.length).toBe(3)
    expect(b.groups![0]).toMatchObject({ titleKey: 'garmin.day.bbEvent.SLEEP' })
    expect(b.groups![0].items.map((i) => i.value)).toEqual(['23:03', 28980, 55])
  })

  it('sleep: stages, score + sub-scores with qualifiers', () => {
    const s = sec('sleep')
    expect(item(s, 'sleepDuration')).toMatchObject({ value: 28080, unit: 'sec' })
    expect(item(s, 'sleepScore')).toMatchObject({ value: 80, qualifierKey: 'garmin.day.q.GOOD' })
    expect(item(s, 'sleepScore.remPercentage')).toMatchObject({ value: 12, unit: '%', qualifierKey: 'garmin.day.q.FAIR' })
    expect(item(s, 'sleepScore.stress')).toMatchObject({ value: 'FAIR', valueKey: 'garmin.day.q.FAIR' })
    expect(keys(s).filter((k) => k.startsWith('sleepScore.')).length).toBe(7)
    expect(item(s, 'sleepNeed')?.value).toBe(450)
    expect(item(s, 'sleepStart')?.value).toBe('23:03')
    const c = s.charts![0]
    if (c.kind !== 'stacked') throw new Error('stacked expected')
    expect(c.segments.map((x) => x.value)).toEqual([3600, 21180, 3300, 900])
  })

  it('respiration + spo2: items and hourly bars', () => {
    const r = sec('respiration')
    expect(item(r, 'respAvg')?.value).toBe(13)
    expect(item(r, 'spo2Avg')?.value).toBe(96)
    const c = r.charts![0]
    if (c.kind !== 'bars') throw new Error('bars expected')
    expect(c.bars.length).toBeGreaterThan(2)
    expect(c.bars[0]).toEqual({ label: '00', v: 97 })
  })

  it('activities: one group per activity with items and HR zones', () => {
    const a = sec('activities')
    expect(a.groups!.length).toBe(1)
    const g = a.groups![0]
    expect(g.titleKey).toBe('garmin.type.strength_training')
    expect(g.items.map((i) => i.key.replace('garmin.day.i.', ''))).toEqual(
      expect.arrayContaining(['actDuration', 'actCalories', 'actAvgHr', 'actMaxHr', 'actAerobicTe', 'actLoad', 'actBodyBattery', 'actSets', 'actReps']),
    )
    expect(g.items.find((i) => i.key.endsWith('actAerobicTe'))?.value).toBe(0.9)
    const z = g.charts![0]
    if (z.kind !== 'stacked') throw new Error('stacked expected')
    expect(z.segments.map((x) => x.key)).toEqual(['garmin.day.zone.1', 'garmin.day.zone.2', 'garmin.day.zone.3'])
  })

  it('omits missing parts', () => {
    const v = garminDayDetailView({ sleep: detail.sleep })
    expect(v.sections.map((s) => s.id)).toEqual(['sleep'])
    expect(garminDayDetailView({ hrv: {}, activities: [] }).sections).toEqual([])
  })

  it('other: water only when consumed', () => {
    expect(view.sections.some((s) => s.id === 'other')).toBe(false)
    const d = { summary: { hydration: { goalInMl: 3000, consumedInMl: 500 } } }
    const o = garminDayDetailView(d).sections.find((s) => s.id === 'other')!
    expect(o.items.map((i) => i.value)).toEqual([500, 3000])
  })

  it('summaryOnly: row items when detail is missing', () => {
    const row = { steps: 100, sleepStart: '23:00', sleepEnd: '07:00', activities: [{ type: 'running', minutes: 30 }, { type: 'trail_run', minutes: 5 }] }
    for (const d of [undefined, {}]) {
      const v = garminDayDetailView(d, row)
      expect(v.summaryOnly).toBe(true)
      expect(v.sections.map((s) => s.id)).toEqual(['activity', 'sleep', 'activities'])
      expect(v.sections[2].groups![0]).toMatchObject({ titleKey: 'garmin.type.running' })
      expect(v.sections[2].groups![1].title).toBe('Trail run')
    }
    expect(garminDayDetailView(undefined)).toEqual({ sections: [], summaryOnly: true })
  })

  it('every i18n key used exists in ru, en and uk', () => {
    const used = new Set<string>()
    const unitsSeen = new Set<string>()
    const visit = (items: { key: string; unit?: string; valueKey?: string; qualifierKey?: string }[]) =>
      items.forEach((i) => {
        used.add(i.key)
        if (i.valueKey) used.add(i.valueKey)
        if (i.qualifierKey) used.add(i.qualifierKey)
        if (i.unit) unitsSeen.add(i.unit)
      })
    const chart = (c: NonNullable<DetailSection['charts']>[number]) => {
      used.add(c.titleKey)
      if (c.kind === 'stacked') c.segments.forEach((s) => used.add(s.key))
    }
    for (const s of view.sections) {
      used.add(`garmin.day.section.${s.id}`)
      visit(s.items)
      s.charts?.forEach(chart)
      s.groups?.forEach((g) => {
        if (g.titleKey) used.add(g.titleKey)
        visit(g.items)
        g.charts?.forEach(chart)
      })
    }
    for (const u of unitsSeen) if (u !== 'sec' && u !== 'm') used.add(`garmin.day.unit.${u}`)
    for (const k of ['title', 'back', 'noDetail', 'allFields', 'points']) used.add(`garmin.day.${k}`)
    for (const [name, d] of Object.entries({ ru, en, uk })) {
      const missing = [...used].filter((k) => !(k in d))
      expect(missing, name).toEqual([])
    }
  })
})

describe('formatters', () => {
  it('formatDuration', () => {
    expect(formatDuration(28080, 'ru-RU')).toBe('7 ч 48 мин')
    expect(formatDuration(3600, 'en-GB')).toBe('1 h')
    expect(formatDuration(1500, 'uk-UA')).toBe('25 хв')
  })
  it('formatDistance', () => {
    expect(formatDistance(500, 'en-GB')).toBe('500 m')
    expect(formatDistance(9760, 'en-GB')).toBe('9.76 km')
    expect(formatDistance(9760, 'ru-RU')).toMatch(/^9,76 км$/)
  })
})

describe('flattenForTree', () => {
  const rows = flattenForTree(detail)
  const get = (p: string) => rows.find((r) => r.path === p)?.value
  it('is sorted and flat', () => {
    const paths = rows.map((r) => r.path)
    expect(paths).toEqual([...paths].sort())
    expect(get('summary.movement.steps.value')).toBe(11711)
    expect(get('sleep.sleepScores.overall.qualifierKey')).toBe('GOOD')
    expect(get('summary.includesWellnessData')).toBe(true)
  })
  it('skips nulls, summarises series, indexes object arrays', () => {
    expect(rows.some((r) => r.path === 'sleep.autoSleepStartTimestampGMT')).toBe(false)
    expect(get('heartRate.heartRateValues')).toMatch(/^\d+ точек$/)
    expect(get('spo2.spO2HourlyAverages')).toMatch(/^\d+ точек$/)
    expect(get('activities[0].summarizedExerciseSets[0].category')).toBe('CURL')
    expect(get('bodyBattery.bodyBatteryActivityEvent[1].eventType')).toBe('ACTIVITY')
    expect(flattenForTree({ hrv: { a: [1, 2] } }, (n) => `${n} pts`)).toEqual([{ path: 'hrv.a', value: '2 pts' }])
    expect(flattenForTree(undefined)).toEqual([])
  })
  it('collapses long arrays of flat records, keeps short ones indexed, guards depth', () => {
    expect(get('hrv.hrvReadings')).toMatch(/^\d+ точек$/)
    const long = Array.from({ length: 25 }, (_, i) => ({ v: i, at: 'x' }))
    expect(flattenForTree({ summary: { a: long } }, (n) => `${n}p`)).toEqual([{ path: 'summary.a', value: '25p' }])
    expect(flattenForTree({ summary: { a: [{ v: 1 }, { v: 2 }] } })).toEqual([
      { path: 'summary.a[0].v', value: 1 },
      { path: 'summary.a[1].v', value: 2 },
    ])
    let deep: Record<string, unknown> = { leaf: 1 }
    for (let i = 0; i < 20; i++) deep = { n: deep }
    expect(flattenForTree({ summary: deep })).toEqual([])
    expect(flattenForTree({ summary: { n: { leaf: 1 } } })).toEqual([{ path: 'summary.n.leaf', value: 1 }])
  })
})

describe('watchOffsetMs', () => {
  it('is local start minus GMT start (+1 h in the fixtures), 0 when unknown', () => {
    expect(watchOffsetMs(detail)).toBe(3_600_000)
    expect(watchOffsetMs({})).toBe(0)
    expect(watchOffsetMs(undefined)).toBe(0)
  })
})
