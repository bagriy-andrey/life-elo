import { useI18n } from '../../i18n'
import type { TimeSeries } from '../../domain/habitCharts'
import './TimeChart.css'

const W = 300
const H = 120
const STEP = 10

/** Minutes (possibly night-wrapped, > 1440) -> "HH:MM". */
function formatClock(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

const rect = (x: number, y: number, w: number, h: number) =>
  `M${x} ${y.toFixed(1)}h${w}v${Math.max(0, h).toFixed(1)}h${-w}z`
const dot = (x: number, y: number, r: number) =>
  `M${x - r} ${y.toFixed(1)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`

export function TimeChart({ series }: { series: TimeSeries }) {
  const { t, locale } = useI18n()
  const { points, bounds, share, avg4w, diffMinutes } = series
  const tolOff = bounds.tolerable - bounds.target
  const offs = points.filter((p) => p.minutes !== null).map((p) => (p.minutes as number) - bounds.target)
  const top = Math.min(-60, ...offs) - 5
  const bot = Math.max(tolOff + 45, ...offs) + 5
  const Y = (o: number) => 6 + ((o - top) / (bot - top)) * 108

  let line = ''
  let gap = true
  const dots = { onTime: '', tolerable: '', late: '' }
  points.forEach((p, i) => {
    if (p.minutes === null || p.zone === 'nodata') {
      gap = true
      return
    }
    const x = i * STEP + STEP / 2
    const y = Y(p.minutes - bounds.target)
    line += `${gap ? 'M' : 'L'}${x} ${y.toFixed(1)}`
    gap = false
    dots[p.zone] += dot(x, y, 3.5)
  })

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
      <svg className="time-chart__svg" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <path className="time-chart__zone time-chart__zone--onTime" d={rect(0, 0, W, yT)} />
        <path className="time-chart__zone time-chart__zone--tolerable" d={rect(0, yT, W, yTol - yT)} />
        <path className="time-chart__zone time-chart__zone--late" d={rect(0, yTol, W, H - yTol)} />
        <line className="time-chart__dash time-chart__dash--onTime" x1="0" x2={W} y1={yT} y2={yT} />
        <line className="time-chart__dash time-chart__dash--tolerable" x1="0" x2={W} y1={yTol} y2={yTol} />
        {line && <path className="time-chart__line" d={line} />}
        <path className="time-chart__dot--onTime" d={dots.onTime} />
        <path className="time-chart__dot--tolerable" d={dots.tolerable} />
        <path className="time-chart__dot--late" d={dots.late} />
        <text className="time-chart__lbl time-chart__lbl--onTime" x="2" y={yT - 3}>
          {formatClock(bounds.target)}
        </text>
        <text className="time-chart__lbl time-chart__lbl--tolerable" x="2" y={yTol - 3}>
          {formatClock(bounds.tolerable)}
        </text>
      </svg>
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
