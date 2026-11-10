import { useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { useI18n } from '../../i18n'
import type { TimeSeries } from '../../domain/habitCharts'
import { nearestIndex, smoothRuns, type Pt } from './chartHover'
import './TimeChart.css'

/** Plot height in px; the width follows the card (measured), so points and labels keep their pixel size. */
const H = 160
/** Left gutter for the target / tolerable time labels. */
const PAD_L = 34
const PAD_Y = 8

/** Minutes (possibly night-wrapped, > 1440) -> "HH:MM". */
function formatClock(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

const rect = (x: number, y: number, w: number, h: number) =>
  `M${x} ${y.toFixed(1)}h${w}v${Math.max(0, h).toFixed(1)}h${-w}z`
/** Vertical grid every 5 days, counted from the right edge (today). */
const GRID_EVERY = 5

export function TimeChart({ series }: { series: TimeSeries }) {
  const { t, locale } = useI18n()
  const [active, setActive] = useState<number | null>(null)
  const plotRef = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(320)
  useLayoutEffect(() => {
    const el = plotRef.current
    if (!el) return
    const measure = () => el.clientWidth > 0 && setW(el.clientWidth)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const { points, bounds, share, avg4w, diffMinutes } = series
  const tolOff = bounds.tolerable - bounds.target
  const offs = points.filter((p) => p.minutes !== null).map((p) => (p.minutes as number) - bounds.target)
  const top = Math.min(-60, ...offs) - 5
  const bot = Math.max(tolOff + 45, ...offs) + 5
  const Y = (o: number) => PAD_Y + ((o - top) / (bot - top)) * (H - 2 * PAD_Y)
  const step = (W - PAD_L) / Math.max(1, points.length)
  const X = (i: number) => PAD_L + i * step + step / 2

  const xy: (Pt | null)[] = points.map((p, i) =>
    p.minutes === null || p.zone === 'nodata' ? null : [X(i), Y(p.minutes - bounds.target)],
  )
  const line = smoothRuns(xy)
  // Horizontal grid on whole hours inside the visible range.
  const hours: number[] = []
  for (let m = Math.ceil((bounds.target + top) / 60) * 60; m <= bounds.target + bot; m += 60) hours.push(m)
  const columns = Array.from({ length: Math.floor((points.length - 1) / GRID_EVERY) + 1 }, (_, k) => points.length - 1 - k * GRID_EVERY)

  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    if (r.width <= 0) return
    const x = ((e.clientX - r.left) / r.width) * W
    setActive(nearestIndex(xy.map(Boolean), (x - PAD_L) / (W - PAD_L)))
  }
  const hit = active === null ? null : xy[active]
  const activePoint = active === null ? null : points[active]
  const zoneLabel = { onTime: t('habit.chart.onTime'), tolerable: t('habit.chart.tolerable'), late: t('habit.chart.late'), nodata: '' }

  const fmtDay = (day: string | undefined) => {
    if (!day) return ''
    const [y, m, d] = day.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  }
  const yT = Y(0)
  const yTol = Y(tolOff)
  const delta =
    diffMinutes === null
      ? null
      : diffMinutes === 0
        ? t('habit.chart.same')
        : t(diffMinutes < 0 ? 'habit.chart.earlier' : 'habit.chart.later', { count: Math.abs(diffMinutes) })
  const legend = [
    { zone: 'onTime', label: t('habit.chart.onTime'), pct: share.onTime },
    { zone: 'tolerable', label: t('habit.chart.tolerable'), pct: share.tolerable },
    { zone: 'late', label: t('habit.chart.late'), pct: share.late },
  ] as const

  return (
    <section className="time-chart" aria-label={t('habit.chart.timeByDay')}>
      <div className="time-chart__head">
        <strong>{t('habit.chart.timeByDay')}</strong>
        <span className="time-chart__sub">{t('habit.chart.last30')}</span>
      </div>
      <div className="time-chart__top">
        <strong className="time-chart__avg">{avg4w === null ? '—' : formatClock(avg4w)}</strong>
        <span className="time-chart__sub">{t('habit.chart.avgTime')}</span>
        {delta !== null && (
          <span
            className={`time-chart__delta ${diffMinutes !== null && diffMinutes > 0 ? 'time-chart__delta--late' : 'time-chart__delta--early'}`}
          >
            {delta}
          </span>
        )}
      </div>
      <div
        ref={plotRef}
        className="time-chart__plot"
        onPointerMove={(e) => e.pointerType === 'mouse' && pick(e)}
        onPointerDown={pick}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
      >
        <svg className="time-chart__svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <path className="time-chart__zone time-chart__zone--onTime" d={rect(PAD_L, 0, W - PAD_L, yT)} />
          <path className="time-chart__zone time-chart__zone--tolerable" d={rect(PAD_L, yT, W - PAD_L, yTol - yT)} />
          <path className="time-chart__zone time-chart__zone--late" d={rect(PAD_L, yTol, W - PAD_L, H - yTol)} />
          {hours.map((m) => {
            const y = Y(m - bounds.target)
            return <line key={m} className="time-chart__grid" x1={PAD_L} x2={W} y1={y} y2={y} />
          })}
          {columns.map((i) => {
            const x = X(i)
            return <line key={i} className="time-chart__grid" x1={x} x2={x} y1="0" y2={H} />
          })}
          <line className="time-chart__dash time-chart__dash--onTime" x1={PAD_L} x2={W} y1={yT} y2={yT} />
          <line className="time-chart__dash time-chart__dash--tolerable" x1={PAD_L} x2={W} y1={yTol} y2={yTol} />
          {hit && <line className="time-chart__guide" x1={hit[0]} x2={hit[0]} y1="0" y2={H} />}
          {line && <path className="time-chart__line" d={line} />}
          {xy.map((p, i) =>
            p ? (
              <circle
                key={i}
                className={`time-chart__point time-chart__point--${points[i].zone}${i === active ? ' is-active' : ''}`}
                cx={p[0]}
                cy={p[1]}
                r={i === active ? 3.5 : 2.25}
              />
            ) : null,
          )}
          <text className="time-chart__lbl time-chart__lbl--onTime" x={PAD_L - 5} y={yT} textAnchor="end" dominantBaseline="middle">
            {formatClock(bounds.target)}
          </text>
          <text className="time-chart__lbl time-chart__lbl--tolerable" x={PAD_L - 5} y={yTol} textAnchor="end" dominantBaseline="middle">
            {formatClock(bounds.tolerable)}
          </text>
        </svg>
        {hit && activePoint && activePoint.minutes !== null && (
          <div
            className={`time-chart__tip${hit[0] / W < 0.2 ? ' is-left' : hit[0] / W > 0.8 ? ' is-right' : ''}`}
            style={{ left: `${(hit[0] / W) * 100}%`, top: `${(hit[1] / H) * 100}%` }}
            role="status"
          >
            <span className="time-chart__tip-day">{fmtDay(activePoint.day)}</span>
            <strong>{formatClock(activePoint.minutes)}</strong>
            <span className={`time-chart__tip-zone time-chart__tip-zone--${activePoint.zone}`}>{zoneLabel[activePoint.zone]}</span>
          </div>
        )}
      </div>
      <div className="time-chart__dates">
        <span>{fmtDay(points[0]?.day)}</span>
        <span>{fmtDay(points[Math.floor(points.length / 2)]?.day)}</span>
        <span>{t('habit.chart.today')}</span>
      </div>
      <svg className="time-chart__share" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
        <rect className="time-chart__fill--onTime" x="0" y="0" height="8" width={share.onTime} />
        <rect className="time-chart__fill--tolerable" x={share.onTime} y="0" height="8" width={share.tolerable} />
        <rect
          className="time-chart__fill--late"
          x={share.onTime + share.tolerable}
          y="0"
          height="8"
          width={share.late}
        />
      </svg>
      <div className="time-chart__legend">
        {legend.map((l) => (
          <span key={l.zone} className="time-chart__legend-item">
            <span className={`time-chart__swatch time-chart__swatch--${l.zone}`} />
            <strong>{`${l.pct}%`}</strong>
            {l.label}
          </span>
        ))}
      </div>
    </section>
  )
}
