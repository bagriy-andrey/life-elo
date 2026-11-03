import { describe, expect, it } from 'vitest'
import { daysInWeekUpTo, eachDay, isDayLocked, timeToMinutes, weekStart } from './day'

describe('weekStart', () => {
  it('returns Monday for Monday, Sunday and midweek', () => {
    expect(weekStart('2026-11-02')).toBe('2026-11-02') // Mon
    expect(weekStart('2026-11-08')).toBe('2026-11-02') // Sun
    expect(weekStart('2026-11-05')).toBe('2026-11-02')
  })
  it('rolls over month and year', () => {
    expect(weekStart('2026-01-01')).toBe('2025-12-29') // Thu
    expect(weekStart('2026-03-01')).toBe('2026-02-23') // Sun
  })
})

describe('eachDay / daysInWeekUpTo', () => {
  it('is inclusive and handles rollover', () => {
    expect(eachDay('2026-12-30', '2027-01-02')).toEqual(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02'])
    expect(eachDay('2026-11-03', '2026-11-02')).toEqual([])
  })
  it('lists Monday through the day', () => {
    expect(daysInWeekUpTo('2026-11-02')).toEqual(['2026-11-02'])
    expect(daysInWeekUpTo('2026-11-04')).toEqual(['2026-11-02', '2026-11-03', '2026-11-04'])
    expect(daysInWeekUpTo('2026-11-08')).toHaveLength(7)
  })
})

describe('isDayLocked', () => {
  const D = '2026-11-03'
  it('stays open until 03:59 on D+2 and locks at 04:00', () => {
    expect(isDayLocked(D, new Date(2026, 10, 5, 3, 59))).toBe(false)
    expect(isDayLocked(D, new Date(2026, 10, 5, 4, 0))).toBe(true)
  })
  it('yesterday and today are open', () => {
    expect(isDayLocked(D, new Date(2026, 10, 4, 12, 0))).toBe(false)
    expect(isDayLocked(D, new Date(2026, 10, 3, 12, 0))).toBe(false)
  })
})

describe('timeToMinutes', () => {
  it('orders 23:00 before 00:30', () => {
    expect(timeToMinutes('23:00')).toBe(1380)
    expect(timeToMinutes('00:30')).toBe(1470)
    expect(timeToMinutes('23:00')).toBeLessThan(timeToMinutes('00:30'))
    expect(timeToMinutes('01:00')).toBe(1500)
  })
  it('boundary hour itself is a normal time', () => {
    expect(timeToMinutes('03:59')).toBe(24 * 60 + 239)
    expect(timeToMinutes('04:00')).toBe(240)
  })
})
