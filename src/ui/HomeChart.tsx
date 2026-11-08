import { useLayoutEffect, useRef, useState } from 'react'
import type { LedgerEntry } from '../engine/rating'
import { useI18n } from '../i18n'
import { cx } from './components/cx'
import { smoothPath, chartGeometry, periodStats, TEN_DAYS, type HomeRange } from './homeStats'
import { formatDay, formatSigned } from './labels'
import './components/Card.css'
import './HomeChart.css'

interface Props {
  /** Non-empty replayed ledger. */
  ledger: LedgerEntry[]
  /** Selected ledger index. */
  selected: number
  onSelect: (index: number, opts?: { center?: boolean }) => void
  range: HomeRange
  onRangeChange: (range: HomeRange) => void
}

const date = (day: string) => new Date(`${day}T12:00:00`)
const shortDay = (day: string, locale: string) =>
  date(day).toLocaleDateString(locale, { day: 'numeric', month: 'short' }).replace('.', '')
const tone = (n: number) => (n > 0 ? 'pos' : n < 0 ? 'neg' : undefined)

/** «Динамика» card: scrollable rating line with per-day delta chips, period toggle and summary tiles. */
export function HomeChart({ ledger, selected, onSelect, range, onRangeChange }: Props) {
  const { t, locale } = useI18n()
  const [width, setWidth] = useState(360)
  const [centerOn, setCenterOn] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // The toggle only makes sense once there are more days than the short range.
  const hasRanges = ledger.length > TEN_DAYS
  const shown: HomeRange = hasRanges ? range : 'all'
  const geo = chartGeometry(ledger, shown, width)
  const from = geo.offset
  const view = ledger.slice(from)
  const stats = periodStats(ledger, shown)

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  // Newest day on the right: jump to the end when the range, width or day count changes.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [shown, width, ledger.length])

  // A tile picked a day: bring it into the middle of the visible window.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || centerOn === null) return
    const k = centerOn - from
    const left = k * geo.step - (el.clientWidth - geo.step) / 2
    if (typeof el.scrollTo === 'function') el.scrollTo({ left, behavior: 'smooth' })
    else el.scrollLeft = left
    setCenterOn(null)
  }, [centerOn, from, geo.step])

  const pick = (index: number, center: boolean) => {
    if (center) setCenterOn(index)
    onSelect(index, { center })
  }

  const tile = (label: string, index: number, value: string, valueTone?: 'pos' | 'neg') => (
    <button type="button" className="home-tile" onClick={() => pick(index, true)}>
      <span className="home-tile-label">{label}</span>
      <span className="home-tile-row">
        <strong className={valueTone}>{value}</strong>
        <span className="home-tile-sub">{shortDay(ledger[index].day, locale)}</span>
      </span>
    </button>
  )

  const line = smoothPath(geo.points)
  const first = geo.points[0]
  const last = geo.points.at(-1)!
  const area = `${line} L${last[0]},${geo.zeroY} L${first[0]},${geo.zeroY} Z`

  return (
    <section className="card home-chart">
      <div className="home-chart-head">
        <div className="home-chart-title">
          <h2>{t('home.chartTitle')}</h2>
          <span className="muted">
            <strong className={cx('home-num', tone(stats.change))}>{formatSigned(stats.change, 1)}</strong>{' '}
            {shown === 'ten' ? t('home.periodLabel10') : t('home.periodLabelAll')}
          </span>
        </div>
        {hasRanges && (
          <div role="tablist" aria-label={t('home.rangeLabel')} className="home-range">
            {(['ten', 'all'] as const).map((r) => (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={shown === r}
                className={cx(shown === r && 'on')}
                onClick={() => onRangeChange(r)}
              >
                {r === 'ten' ? t('home.period10') : t('home.periodAll')}
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={scrollRef} className="home-scroll" role="group" aria-label={t('home.chartAria')}>
        <div className="home-plot" style={{ width: geo.innerW }}>
          <svg width={geo.innerW} height={geo.height} aria-hidden="true" className="home-svg">
            <defs>
              <linearGradient id="homeAreaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" className="home-fill-top" />
                <stop offset="1" className="home-fill-bottom" />
              </linearGradient>
            </defs>
            {geo.grid.map((y) => (
              <line key={y} x1="0" x2={geo.innerW} y1={y} y2={y} className="home-grid" />
            ))}
            <path d={area} fill="url(#homeAreaFill)" />
            <line x1="0" x2={geo.innerW} y1={geo.zeroY} y2={geo.zeroY} className="home-zero" />
            <path d={line} className="home-line" />
          </svg>
          <span className="home-zero-label" style={{ top: geo.zeroY - 6 }}>0</span>
          <div className="home-cols">
            {view.map((e, k) => {
              const i = from + k
              const sel = i === selected
              const d = date(e.day)
              const monthStart = d.getDate() === 1 || (k > 0 && date(view[k - 1].day).getMonth() !== d.getMonth())
              const edge = k === 0 ? 'first' : k === view.length - 1 ? 'last' : undefined
              const dotY = geo.points[k][1]
              return (
                <button
                  key={e.day}
                  type="button"
                  className={cx('home-col', sel && 'sel', e.delta < 0 ? 'neg' : 'pos')}
                  style={{ width: geo.step }}
                  aria-pressed={sel}
                  aria-label={t('home.point', {
                    day: formatDay(e.day, locale),
                    delta: formatSigned(e.delta),
                    rating: formatSigned(e.ratingAfter, 1),
                  })}
                  onClick={() => pick(i, false)}
                >
                  <span className="home-col-plot">
                    {sel && (
                      <>
                        <span className="home-guide" style={{ top: dotY }} />
                        <span className={cx('home-tip', edge)} style={{ top: Math.max(2, dotY - 50) }}>
                          <strong>{formatSigned(e.ratingAfter, 1)}</strong>
                          <span>{shortDay(e.day, locale)}</span>
                        </span>
                      </>
                    )}
                    <span className="home-dot" style={{ top: dotY }} />
                  </span>
                  <span className="home-chip">{formatSigned(Math.round(e.delta), 0)}</span>
                  <span className="home-day">{monthStart ? shortDay(e.day, locale) : d.getDate()}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="home-tiles">
        {tile(t('home.min'), stats.iMin, formatSigned(ledger[stats.iMin].ratingAfter, 1), tone(ledger[stats.iMin].ratingAfter))}
        {tile(t('home.max'), stats.iMax, formatSigned(ledger[stats.iMax].ratingAfter, 1), tone(ledger[stats.iMax].ratingAfter))}
        {tile(t('home.best'), stats.iBest, formatSigned(ledger[stats.iBest].delta), tone(ledger[stats.iBest].delta))}
        {tile(t('home.worst'), stats.iWorst, formatSigned(ledger[stats.iWorst].delta), tone(ledger[stats.iWorst].delta))}
        <button
          type="button"
          className="home-tile wide"
          disabled={stats.streakRecordEnd < 0}
          onClick={() => pick(stats.streakRecordEnd, true)}
        >
          <span className="home-tile-label">{t('home.streak')}</span>
          <span className="home-tile-row">
            <strong className={cx(stats.streakNow > 0 && 'pos')}>
              {stats.streakNow > 0 ? t('home.streakNow', { count: stats.streakNow }) : t('home.streakNone')}
            </strong>
            <span className="home-tile-sub">{t('home.streakRecord', { count: stats.streakRecord })}</span>
          </span>
        </button>
      </div>
    </section>
  )
}
