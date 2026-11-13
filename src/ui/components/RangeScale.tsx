import { cx } from './cx'
import { corridorRect, scaleX, SCALE_WIDTH } from './rangeScaleMath'
import './RangeScale.css'

interface Props {
  min: number
  max: number
  value: number
  /** Normal range; omit when there is no baseline (bar + dot only). */
  corridor?: { low: number; high: number }
  /** Dot color. */
  tone: 'accent' | 'pos' | 'neg' | 'warn'
  lowLabel: string
  highLabel: string
  /** Text under the corridor, e.g. «норма 56–64». */
  corridorLabel?: string
  className?: string
}

/** Decorative (aria-hidden) range scale: 8px bar, optional normal corridor, value dot. The value is stated in text by the caller. */
export function RangeScale({ min, max, value, corridor, tone, lowLabel, highLabel, corridorLabel, className }: Props) {
  const rect = corridor ? corridorRect(corridor.low, corridor.high, min, max) : null
  const cx0 = scaleX(value, min, max)
  const rightHalf = rect ? rect.x > SCALE_WIDTH * 0.6 : false
  return (
    <svg
      className={cx('rscale', className)}
      viewBox={`0 0 ${SCALE_WIDTH} 40`}
      preserveAspectRatio="xMinYMid meet"
      aria-hidden="true"
    >
      <rect className="rscale-bar" x="0" y="12" width={SCALE_WIDTH} height="8" rx="4" />
      {rect && <rect className="rscale-corridor" x={rect.x} y="12" width={rect.width} height="8" rx="4" />}
      <circle className={`rscale-dot rscale-${tone}`} cx={cx0} cy="16" r="7" />
      {rect && corridorLabel && (
        <text
          className="rscale-label"
          x={rightHalf ? rect.x + rect.width : rect.x}
          y="36"
          textAnchor={rightHalf ? 'end' : 'start'}
        >
          {corridorLabel}
        </text>
      )}
      <text className="rscale-label" x="0" y="36">{lowLabel}</text>
      <text className="rscale-label" x={SCALE_WIDTH} y="36" textAnchor="end">{highLabel}</text>
    </svg>
  )
}
