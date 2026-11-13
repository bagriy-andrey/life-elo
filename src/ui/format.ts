import type { I18n } from '../i18n'
import { formatSigned } from './labels'

type T = I18n['t']

const DURATION_UNITS: Record<string, { h: string; min: string }> = {
  ru: { h: 'ч', min: 'мин' },
  uk: { h: 'год', min: 'хв' },
  en: { h: 'h', min: 'min' },
}
const DISTANCE_UNITS: Record<string, { m: string; km: string }> = {
  ru: { m: 'м', km: 'км' },
  uk: { m: 'м', km: 'км' },
  en: { m: 'm', km: 'km' },
}
const lang = (locale: string) => locale.slice(0, 2).toLowerCase()
const NBSP = ' '
const pad = (n: number) => String(n).padStart(2, '0')

/** `28080` -> `7 ч 48 мин`. Seconds are rounded to the nearest minute, so under 30 s shows `0 мин`. */
export function formatDuration(seconds: number, locale: string): string {
  const u = DURATION_UNITS[lang(locale)] ?? DURATION_UNITS.en
  const total = Math.max(0, Math.round(seconds / 60))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} ${u.min}`
  return m === 0 ? `${h} ${u.h}` : `${h} ${u.h} ${m} ${u.min}`
}

/** Same as `formatDuration`, for a value in seconds (alias that names the unit). */
export const formatDurationSec = formatDuration

/** `9760` -> `9,76 км` (2 decimals max); under 1 km whole metres. */
export function formatDistance(meters: number, locale: string): string {
  const u = DISTANCE_UNITS[lang(locale)] ?? DISTANCE_UNITS.en
  if (Math.abs(meters) < 1000) return `${Math.round(meters)} ${u.m}`
  const km = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(meters / 1000)
  return `${km} ${u.km}`
}

/** Grouped integer/decimal; ru/uk group with a non-breaking space (`11 711`), minus is U+2212. */
export function formatNumber(n: number, locale: string, maxFractionDigits = 0): string {
  const body = new Intl.NumberFormat(locale, { maximumFractionDigits: maxFractionDigits, useGrouping: true })
    .format(Math.abs(n))
    .replace(/[   ]/g, NBSP)
  const rounded = Number(Math.abs(n).toFixed(maxFractionDigits))
  return n < 0 && rounded !== 0 ? `−${body}` : body
}

/** Signed delta, «+62» / «−4» (U+2212), via `labels.formatSigned`. */
export const formatDelta = (n: number, digits = 0) => formatSigned(n, digits)

/** «пт, 13 ноября»: short weekday, lower-case month. */
export function formatDayShort(day: string, locale: string): string {
  return new Date(`${day}T12:00:00`)
    .toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'long' })
    .toLowerCase()
}

/** «9–15 ноября», or «28 окт – 3 нояб» style across months: «30 октября – 5 ноября». */
export function formatWeekRange(startDay: string, endDay: string, locale: string): string {
  const a = new Date(`${startDay}T12:00:00`)
  const b = new Date(`${endDay}T12:00:00`)
  const month = (d: Date) =>
    (new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).formatToParts(d).find((p) => p.type === 'month')?.value ?? '').toLowerCase()
  const full = (d: Date) => `${d.getDate()} ${month(d)}`
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return `${a.getDate()}–${full(b)}`
  return `${full(a)} – ${full(b)}`
}

/** `HH:MM` of a Date in the viewer's local time. */
export const formatClock = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

/** «13:57», or «вчера в 13:57» when the sync is more than 24 h old. */
export function formatSyncTime(iso: string, now: Date, t: T): string {
  const at = new Date(iso)
  const clock = formatClock(at)
  return now.getTime() - at.getTime() > 24 * 3600_000 ? t('garmin.day.syncYesterday', { time: clock }) : clock
}
