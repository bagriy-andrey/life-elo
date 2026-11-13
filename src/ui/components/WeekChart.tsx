import { cx } from './cx'
import {
  BAR_W, colCenter, GOAL_LABEL_MAX, gutterLabelX, GUTTER_X, PLOT_PCT, PLOT_W, SLEEP_H, SLEEP_TICKS, sleepStrip,
  sleepY, STEPS_BASE, STEPS_H, stepsBar, stepsScale, stepsY, VB_W,
} from './weekChartMath'
import './WeekChart.css'

export interface WeekChartDay {
  key: string
  weekdayLabel: string
  dayNum: string | number
  steps?: number
  /** Sleep strip as fractions of the 22:00-10:00 axis (clamped). */
  sleep?: { startFrac: number; endFrac: number }
  state: 'selected' | 'past' | 'future' | 'today'
  /** Set when the day is today even though state is 'selected' (aria-current="date"). */
  isToday?: boolean
  /** Accessible name with the values in words (caller-localized). */
  ariaLabel: string
  /** Short text above the selected day's bar, e.g. «40». */
  stepsText?: string
}

interface Props {
  /** Seven days, Monday first. */
  days: WeekChartDay[]
  stepsGoal?: number
  /** Goal line label in the right gutter; must be short (≤5 chars, e.g. «11,4к»), longer text is truncated. */
  goalLabel?: string
  stepsCaption: string
  sleepCaption: string
  onSelect: (key: string) => void
  className?: string
}

/** Week card body: steps bars + goal line, sleep strips on a 22:00-10:00 axis, and a row of day buttons aligned with the columns. */
export function WeekChart({ days, stepsGoal, goalLabel, stepsCaption, sleepCaption, onSelect, className }: Props) {
  const goal = typeof stepsGoal === 'number' && stepsGoal > 0 ? stepsGoal : undefined
  const scale = stepsScale(days.map((d) => d.steps), goal)
  const goalY = goal !== undefined ? stepsY(goal, scale) : null
  return (
    <div className={cx('wchart', className)}>
      <div className="wchart-block">
        <span className="wchart-cap">{stepsCaption}</span>
        <svg className="wchart-svg" viewBox={`0 0 ${VB_W} ${STEPS_H}`} aria-hidden="true">
          <line className="wchart-axis" x1="0" x2={PLOT_W} y1={STEPS_BASE} y2={STEPS_BASE} />
          {goalY !== null && (
            <>
              <line className="wchart-goal" x1="0" x2={PLOT_W} y1={goalY} y2={goalY} />
              {goalLabel && (
                <text className="wchart-text" x={gutterLabelX(goalLabel.slice(0, GOAL_LABEL_MAX))} y={goalY + 4}>
                  {goalLabel.slice(0, GOAL_LABEL_MAX)}
                </text>
              )}
            </>
          )}
          {days.map((d, i) => {
            const bar = stepsBar(d.steps, scale)
            if (!bar) return null
            const sel = d.state === 'selected'
            return (
              <g key={d.key}>
                <rect
                  className={cx('wchart-bar', sel && 'wchart-bar-selected')}
                  x={colCenter(i) - BAR_W / 2} y={bar.y} width={BAR_W} height={bar.height} rx="4"
                />
                {sel && d.stepsText && (
                  <text className="wchart-val" x={colCenter(i)} y={bar.y - 4} textAnchor="middle">{d.stepsText}</text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
      <div className="wchart-block">
        <span className="wchart-cap">{sleepCaption}</span>
        <svg className="wchart-svg" viewBox={`0 0 ${VB_W} ${SLEEP_H}`} aria-hidden="true">
          {SLEEP_TICKS.map((t, i) => {
            const y = sleepY(t.frac)
            const edge = i === 0 || i === SLEEP_TICKS.length - 1
            return (
              <g key={t.label}>
                <line className={edge ? 'wchart-axis' : 'wchart-grid'} x1="0" x2={PLOT_W} y1={y} y2={y} />
                <text className="wchart-text" x={GUTTER_X} y={y + 3}>{t.label}</text>
              </g>
            )
          })}
          {days.map((d, i) => {
            const strip = sleepStrip(d.sleep)
            if (!strip) return null
            return (
              <rect
                key={d.key}
                className={cx('wchart-strip', d.state === 'selected' && 'wchart-strip-selected')}
                x={colCenter(i) - BAR_W / 2} y={strip.y} width={BAR_W} height={strip.height} rx="6"
              />
            )
          })}
        </svg>
      </div>
      <div className="wchart-days" style={{ width: `${PLOT_PCT}%` }}>
        {days.map((d) => (
          <button
            key={d.key}
            type="button"
            className={cx('wchart-day', `wchart-day-${d.state}`)}
            disabled={d.state === 'future'}
            aria-pressed={d.state === 'future' ? undefined : d.state === 'selected'}
            aria-current={d.isToday || d.state === 'today' ? 'date' : undefined}
            aria-label={d.ariaLabel}
            onClick={() => onSelect(d.key)}
          >
            <span>{d.weekdayLabel}</span>
            <span>{d.dayNum}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
