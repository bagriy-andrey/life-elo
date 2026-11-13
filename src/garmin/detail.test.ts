import { describe, expect, it } from 'vitest'
import { buildDetail, isPrivateKey, stripPrivate, type GarminDetailRaw } from './detail'
import summaries from './fixtures/detail-summaries.json'
import sleep from './fixtures/detail-sleep.json'
import hr from './fixtures/detail-hr.json'
import hrv from './fixtures/detail-hrv.json'
import spo2 from './fixtures/detail-spo2.json'
import bodyBattery from './fixtures/detail-bodybattery.json'
import activities from './fixtures/detail-activities.json'

const DAY = '2026-11-12'
const raw: GarminDetailRaw = { summaries, sleep, heartRate: hr, hrv, spo2, bodyBattery, activities }

function allKeys(v: unknown, acc: string[] = []): string[] {
  if (Array.isArray(v)) v.forEach((x) => allKeys(x, acc))
  else if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) {
      acc.push(k)
      allKeys(x, acc)
    }
  return acc
}

const DIRTY = {
  uuid: 'x',
  userProfilePk: 1,
  nested: { ownerId: 1, ownerFullName: 'n', ownerProfileImageUrlLarge: 'u', keep: 1, list: [{ deviceId: 5, ok: 2 }] },
  metadataDTO: { userInfoDto: { displayName: 'n' }, lapCount: 1 },
  startLatitude: 1,
  endLongitude: 2,
  lat: 1,
  lon: 2,
  polyline: 'abc',
  activityUUID: 'u',
  latestSpO2: 95,
  duration: 3,
}

describe('stripPrivate', () => {
  it('drops identifiers, names and coordinates at any depth, keeps the rest', () => {
    expect(stripPrivate(DIRTY)).toEqual({
      nested: { keep: 1, list: [{ ok: 2 }] },
      metadataDTO: { lapCount: 1 },
      latestSpO2: 95,
      duration: 3,
    })
  })
  it('does not mutate the input', () => {
    stripPrivate(DIRTY)
    expect(DIRTY.uuid).toBe('x')
  })
})

describe('buildDetail', () => {
  it('builds every section from the fixtures', () => {
    const d = buildDetail(raw, DAY)
    expect(Object.keys(d).sort()).toEqual(
      ['activities', 'bodyBattery', 'heartRate', 'hrv', 'sleep', 'spo2', 'summary'].sort(),
    )
    expect(d.summary?.calendarDate).toBe(DAY)
    expect(d.sleep?.calendarDate).toBe(DAY)
    expect(d.bodyBattery?.date).toBe(DAY)
    expect(d.activities).toHaveLength(1)
    expect(Array.isArray(d.heartRate?.heartRateValues)).toBe(true)
  })

  it('no identifier survives anywhere (deep scan)', () => {
    const keys = allKeys(buildDetail(raw, DAY))
    expect(keys.length).toBeGreaterThan(100)
    expect(keys.filter((k) => isPrivateKey(k))).toEqual([])
    expect(JSON.stringify(buildDetail(raw, DAY))).not.toMatch(/uuid|userProfile|owner|deviceId|displayName|userInfoDto/i)
  })

  it('splits activities by startTimeLocal day', () => {
    const a = activities[0]
    const list = [
      a,
      { ...a, activityId: 2, startTimeLocal: '2026-11-13 08:00:00' },
      { ...a, activityId: 3, startTimeLocal: '2026-11-12 20:00:00' },
    ]
    expect(buildDetail({ activities: list }, DAY).activities).toHaveLength(2)
    expect(buildDetail({ activities: list }, '2026-11-13').activities).toHaveLength(1)
    expect(buildDetail({ activities: list }, '2026-11-14').activities).toBeUndefined()
  })

  it('picks the matching day from summaries and body battery', () => {
    expect(buildDetail(raw, '2026-11-13').summary?.calendarDate).toBe('2026-11-13')
    expect(buildDetail(raw, '2026-11-13').bodyBattery?.date).toBe('2026-11-13')
    expect(buildDetail(raw, '2026-01-01').summary).toBeUndefined()
  })

  it('ignores sleep/HR responses of another date', () => {
    const d = buildDetail(raw, '2026-11-13')
    expect(d.sleep).toBeUndefined()
    expect(d.heartRate).toBeUndefined()
  })

  it('missing, null, empty and 204 parts are absent', () => {
    expect(buildDetail(undefined, DAY)).toEqual({})
    expect(buildDetail(null, DAY)).toEqual({})
    expect(
      buildDetail(
        { summaries: null, sleep: '', heartRate: {}, hrv: undefined, spo2: [], bodyBattery: [], activities: [] },
        DAY,
      ),
    ).toEqual({})
    expect(Object.keys(buildDetail({ hrv }, DAY))).toEqual(['hrv'])
  })
})

describe('createFailureTracker', () => {
  it('marks single days and, for a range failure, all days', async () => {
    const { createFailureTracker } = await import('./detail')
    const t = createFailureTracker()
    expect(t.isFailed('2026-11-12')).toBe(false)
    t.fail('2026-11-12')
    expect(t.isFailed('2026-11-12')).toBe(true)
    expect(t.isFailed('2026-11-13')).toBe(false)
    t.fail(null)
    expect(t.isFailed('2026-11-13')).toBe(true)
  })
})
