import type { AmountSeries, MonthCount, WeeklySeries } from '../../domain/habitCharts'
import type { HabitDirection } from '../../domain/types'
import { useI18n } from '../../i18n'
import { formatDuration, unitLabels } from '../labels'
import './BarCharts.css'

export type AmountUnit = 'count' | 'minutes' | 'steps'

const AMOUNT_W = 300
const AMOUNT_H = 100
const AMOUNT_PITCH = 10
const WEEK_H = 104
const WEEK_PITCH = 20
const MONTH_H = 52
const MONTH_PITCH = 20

const date = (day: string) => new Date(`${day}T12:00:00`)
const shortDay = (day: string, locale: string) =>
  date(day).toLocaleDateString(locale, { day: 'numeric', month: 'short' }).replace(/\.$/, '')

/** 30-day bars for count / minutes / steps habits, with the dashed target/norm line, total and delta. */
export function AmountChart({
  series,
  direction,
  unit,
}: {
  series: AmountSeries
  direction: HabitDirection
  unit: AmountUnit
}) {
  const { t, locale } = useI18n()
  const constructive = direction === 'constructive'
  const fmt = (n: number) =>
    unit === 'minutes'
      ? formatDuration(t, n)
      : `${Math.round(n).toLocaleString(locale)} ${unitLabels(t, Math.round(n))[unit]}`
  const line = constructive ? series.target : series.norm
  const max = Math.max(line * 1.6, ...series.bars.map((b) => b.value)) || 1
  const delta = `${series.delta >= 0 ? '+' : '−'}${fmt(Math.abs(series.delta))}`
  const title = t('habit.chart.last30')
  const first = series.bars[0]?.day
  const mid = series.bars[Math.floor(series.bars.length / 2)]?.day
  const lineY = AMOUNT_H - (line / max) * 96
  return (
    <section className="bar-chart" aria-label={title}>
      <div className="bar-chart__head">
        <strong>{title}</strong>
        {line > 0 && (
          <span className="bar-chart__caption">
            {constructive ? t('habit.chart.targetLabel') : t('habit.chart.normLabel')} {fmt(line)}
          </span>
        )}
      </div>
      <div className="bar-chart__total">
        <strong>{fmt(series.total)}</strong>
        <span className="bar-chart__caption">{t('habit.chart.total30')}</span>
        <span className={`bar-chart__delta bar-chart__delta--${series.better ? 'pos' : 'neg'}`}>
          {t('habit.chart.vsPrev', { delta })}
        </span>
      </div>
      <svg
        className="bar-chart__svg"
        viewBox={`0 0 ${AMOUNT_W} ${AMOUNT_H}`}
        role="img"
        aria-label={`${title}: ${fmt(series.total)}, ${t('habit.chart.vsPrev', { delta })}`}
      >
        {series.bars.map((b, i) => {
          if (b.value <= 0) return null
          const h = Math.max(1.5, (b.value / max) * 96)
          const cls = b.state === 'below' ? 'below' : b.state === 'over' ? 'over' : 'ok'
          return (
            <rect
              key={b.day}
              className={`bar-chart__bar bar-chart__bar--${cls}`}
              x={i * AMOUNT_PITCH + 1.5}
              y={AMOUNT_H - h}
              width={7}
              height={h}
            />
          )
        })}
        {line > 0 && <line className="bar-chart__dash" x1={0} x2={AMOUNT_W} y1={lineY} y2={lineY} />}
      </svg>
      <div className="bar-chart__dates">
        <span>{first ? shortDay(first, locale) : ''}</span>
        <span>{mid ? shortDay(mid, locale) : ''}</span>
        <span>{t('habit.chart.today')}</span>
      </div>
    </section>
  )
}

/** 12 monthly bars (done days or slips) with the count above each, current month brighter. */
export function MonthlyChart({ months, direction }: { months: MonthCount[]; direction: HabitDirection }) {
  const { t, locale } = useI18n()
  const constructive = direction === 'constructive'
  const title = constructive ? t('habit.chart.byMonthDone') : t('habit.chart.byMonthSlips')
  const max = Math.max(1, ...months.map((m) => m.count))
  const tone = constructive ? 'pos' : 'neg'
  const monthName = (m: string) =>
    date(`${m}-01`).toLocaleDateString(locale, { month: 'short' }).replace(/\.$/, '')
  const summary = months.map((m) => `${monthName(m.month)} ${m.count}`).join(', ')
  return (
    <section className="bar-chart" aria-label={title}>
      <div className="bar-chart__head">
        <strong>{title}</strong>
        {!constructive && <span className="bar-chart__caption">{t('habit.chart.lessBetter')}</span>}
      </div>
      <div className="bar-chart__row bar-chart__row--12 bar-chart__counts" aria-hidden="true">
        {months.map((m) => (
          <span key={m.month}>{m.count}</span>
        ))}
      </div>
      <svg
        className="bar-chart__svg"
        viewBox={`0 0 ${months.length * MONTH_PITCH} ${MONTH_H + 4}`}
        role="img"
        aria-label={`${title}: ${summary}`}
      >
        {months.map((m, i) => {
          if (m.count <= 0) return null
          const h = Math.max(1.5, (m.count / max) * MONTH_H)
          return (
            <rect
              key={m.month}
              className={`bar-chart__bar bar-chart__bar--${tone}${m.current ? '' : '-soft'}`}
              x={i * MONTH_PITCH + 4}
              y={MONTH_H + 3 - h}
              width={12}
              height={h}
            />
          )
        })}
        <path className="bar-chart__axis" d={`M0 ${MONTH_H + 3.5}H${months.length * MONTH_PITCH}`} />
      </svg>
      <div className="bar-chart__row bar-chart__row--12 bar-chart__ticks" aria-hidden="true">
        {months.map((m) => (
          <span key={m.month}>{monthName(m.month)}</span>
        ))}
      </div>
    </section>
  )
}

/** 16 weekly bars (times per week, scale 0–7) with the dashed weekly norm. */
export function WeeklyChart({ series, direction }: { series: WeeklySeries; direction: HabitDirection }) {
  const { t, locale } = useI18n()
  const constructive = direction === 'constructive'
  const title = t('habit.chart.byWeek')
  const unitH = WEEK_H / series.scale.max
  const norm = series.weeks[series.weeks.length - 1]?.norm ?? 0
  const width = series.weeks.length * WEEK_PITCH
  const normY = WEEK_H - norm * unitH
  return (
    <section className="bar-chart" aria-label={title}>
      <div className="bar-chart__head">
        <strong>{title}</strong>
        {norm > 0 && (
          <span className="bar-chart__caption">
            {constructive ? t('habit.chart.targetLabel') : t('habit.chart.normLabel')} {norm}
          </span>
        )}
      </div>
      <svg
        className="bar-chart__svg"
        viewBox={`0 0 ${width} ${WEEK_H + 4}`}
        role="img"
        aria-label={`${title}: ${series.weeks.map((w) => w.count).join(', ')}`}
      >
        {series.weeks.map((w, i) => {
          const count = Math.min(w.count, series.scale.max)
          const base = Math.min(count, w.norm)
          const rest = Math.max(0, count - w.norm)
          const x = i * WEEK_PITCH + 3
          const baseCls = constructive && count >= w.norm ? 'met' : 'miss'
          return (
            <g key={w.weekStart}>
              {base > 0 && (
                <rect
                  className={`bar-chart__bar bar-chart__bar--${baseCls}`}
                  x={x}
                  y={WEEK_H - base * unitH}
                  width={14}
                  height={base * unitH}
                />
              )}
              {rest > 0 && (
                <rect
                  className={`bar-chart__bar bar-chart__bar--${constructive ? 'pos' : 'neg'}`}
                  x={x}
                  y={WEEK_H - count * unitH}
                  width={14}
                  height={rest * unitH}
                />
              )}
            </g>
          )
        })}
        {norm > 0 && <line className="bar-chart__dash" x1={0} x2={width} y1={normY} y2={normY} />}
        <path className="bar-chart__axis" d={`M0 ${WEEK_H + 0.5}H${width}`} />
      </svg>
      <div className="bar-chart__row bar-chart__row--16 bar-chart__ticks" aria-hidden="true">
        {series.weeks.map((w, i) => (
          <span key={w.weekStart}>{i % 4 === 0 ? shortDay(w.weekStart, locale) : ''}</span>
        ))}
      </div>
    </section>
  )
}
